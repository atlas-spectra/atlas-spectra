import { expect, test, type Page } from "@playwright/test";

const route = "/atlas-spectra/flight/";
const screenshots = "artifacts/screenshots";
const experience = (page: Page) => page.locator(".flight-experience");
async function coordinate(page: Page) {
  return Number(await experience(page).getAttribute("data-coordinate"));
}
async function ready(page: Page, url = route) {
  await page.goto(url);
  await expect(experience(page)).toHaveAttribute("data-ready", "true");
  // A fallback is deliberately NOT accepted as a successful 3D visual test.
  await expect(experience(page)).toHaveAttribute("data-renderer", "ready", { timeout: 25_000 });
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function expectSingleLineStepNumbers(page: Page) {
  for (const number of await page.locator(".flight-instruction b").all()) {
    const lines = await number.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    });
    expect(lines).toBe(1);
  }
}

test("Flight renders, scrolls natively, selects records and restores deep links", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await expect(page.locator(".flight-label").first()).toBeVisible();
  await expectSingleLineStepNumbers(page);
  await page.screenshot({ path: `${screenshots}/flight-overview.png`, fullPage: true });

  const start = await coordinate(page);
  const rail = page.getByRole("region", { name: "Frequency flight navigation" });
  await rail.hover();
  await page.mouse.wheel(0, 650);
  await expect.poll(() => coordinate(page)).toBeGreaterThan(start + 0.5);

  await page.getByLabel("Find a phenomenon").fill("A4");
  const result = page.locator(".flight-records button").first();
  await expect(result).toBeVisible();
  const id = await result.getAttribute("data-record-id");
  await result.click();
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", id!);
  await expect(page.getByRole("link", { name: "Full record & provenance" })).toBeVisible();
  // Wait through the debounced URL update so the programmatic scroll event has
  // settled. Rounding scrollTop must not turn a 440 Hz landmark into 439 Hz.
  await page.waitForFunction((value) => new URL(location.href).searchParams.get("entity") === value, id);
  await expect.poll(async () => Math.abs(await coordinate(page) - Math.log10(440))).toBeLessThan(0.0001);
  await expect(page.locator(".flight-hud strong")).toHaveText("440 Hz");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${screenshots}/flight-detail.png`, fullPage: true });
  const selectedAt = await coordinate(page);
  await page.reload();
  await expect(experience(page)).toHaveAttribute("data-renderer", "ready");
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", id!);
  await expect.poll(async () => Math.abs(await coordinate(page) - selectedAt)).toBeLessThan(0.0001);
  await expect(page.locator(".flight-hud strong")).toHaveText("440 Hz");
});

test("Flight clamps keyboard and malformed URL navigation, and resets", async ({ page }) => {
  await ready(page, `${route}?at=3.1&entity=missing-record`);
  await expect.poll(async () => Math.abs(await coordinate(page) - 3.1)).toBeLessThan(0.01);
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", "");
  const rail = page.getByRole("region", { name: "Frequency flight navigation" });
  await rail.focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => coordinate(page)).toBeGreaterThan(3.3);
  await page.keyboard.press("End");
  const max = Number(await experience(page).getAttribute("data-max"));
  await expect.poll(async () => Math.abs(await coordinate(page) - max)).toBeLessThan(0.01);
  for (let i = 0; i < 8; i += 1) await page.keyboard.press("ArrowDown");
  expect(Math.abs(await coordinate(page) - max)).toBeLessThan(0.01);
  await page.keyboard.press("Home");
  const min = Number(await experience(page).getAttribute("data-min"));
  await expect.poll(async () => Math.abs(await coordinate(page) - min)).toBeLessThan(0.01);
  await page.getByRole("button", { name: "Next landmark", exact: false }).click();
  await expect.poll(() => coordinate(page)).toBeGreaterThan(min + 0.1);
  await page.getByRole("button", { name: "Reset flight" }).click();
  await expect.poll(async () => Math.abs(await coordinate(page) - (min + 0.5))).toBeLessThan(0.01);
  await ready(page, `${route}?at=1e300`);
  expect(Math.abs(await coordinate(page) - max)).toBeLessThan(0.01);
  await ready(page, `${route}?at=not-a-number`);
  expect(Number.isFinite(await coordinate(page))).toBe(true);
});

test("unpositioned records remain selectable without moving the camera", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: /Browse all/ }).click();
  const unresolved = page.locator('.flight-records button[data-positioned="false"]').first();
  await expect(unresolved).toBeVisible();
  const id = await unresolved.getAttribute("data-record-id");
  const before = await coordinate(page);
  await unresolved.click();
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", id!);
  expect(await coordinate(page)).toBe(before);
  await expect(page.locator(".flight-inspector")).toContainText("Unpositioned");
});

test("reduced motion disables scroll traversal but leaves discrete controls working", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await expect(page.getByLabel("Scroll to fly")).not.toBeChecked();
  const dimensions = await page.locator(".flight-rail").evaluate((el) => ({ height: el.clientHeight, scroll: el.scrollHeight }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.height + 1);
  const before = await coordinate(page);
  await page.getByRole("button", { name: /Next landmark/ }).click();
  await expect.poll(() => coordinate(page)).toBeGreaterThan(before);
});

test("WebGL unavailable fallback retains searchable records and 2D navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: any[]) {
      if (kind === "webgl2" || kind === "webgl") return null;
      return (original as Function).call(this, kind, ...args);
    } as typeof original;
  });
  await page.goto(route);
  await expect(experience(page)).toHaveAttribute("data-renderer", "unavailable");
  await expect(page.locator(".flight-fallback")).toBeVisible();
  await expect(page.locator(".flight-canvas canvas")).toHaveCount(0);
  await page.getByLabel("Find a phenomenon").fill("quartz");
  await expect(page.locator(".flight-records button").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${screenshots}/flight-fallback.png`, fullPage: true });
});

test("context loss returns to the usable fallback rather than a blank canvas", async ({ page }) => {
  await ready(page);
  await page.locator(".flight-canvas canvas").evaluate((canvas) => canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
  await expect(experience(page)).toHaveAttribute("data-renderer", "unavailable");
  await expect(page.locator(".flight-fallback")).toBeVisible();
  await expect(page.getByLabel("Find a phenomenon")).toBeVisible();
});

test("2D atlas does not request Flight JavaScript", async ({ page }) => {
  const flightRequests: string[] = [];
  page.on("request", (request) => { if (/\/(FrequencyFlight|FlightScene)\.[^/]+\.js/.test(request.url())) flightRequests.push(request.url()); });
  await page.goto("/atlas-spectra/explore/");
  await expect(page.locator(".plot-label").first()).toBeVisible();
  expect(flightRequests).toEqual([]);
});

test.describe("touch Flight", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("native swipe traverses depth and labels stay inside a narrow screen", async ({ page, context }) => {
    await ready(page);
    const before = await coordinate(page);
    const rail = page.locator(".flight-rail");
    await rail.scrollIntoViewIfNeeded();
    const box = await rail.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width * 0.5;
    const y = box!.y + Math.min(box!.height * 0.65, 340);
    const session = await context.newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step += 1) {
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - step * 25 }] });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => coordinate(page)).toBeGreaterThan(before + 0.1);
    await session.detach();
    await page.getByRole("button", { name: "Reset flight" }).tap();
    await expect(page.locator(".flight-label").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    const stageBox = await page.locator(".flight-stage").boundingBox();
    for (const label of await page.locator(".flight-label").all()) {
      const labelBox = await label.boundingBox();
      expect(labelBox!.x).toBeGreaterThanOrEqual(stageBox!.x - 1);
      expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(stageBox!.x + stageBox!.width + 1);
    }
    await expectSingleLineStepNumbers(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${screenshots}/flight-mobile.png`, fullPage: true });
  });
});
