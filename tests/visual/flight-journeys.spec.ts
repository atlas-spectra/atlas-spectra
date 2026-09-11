import { expect, test, type Page } from "@playwright/test";
const route = "/atlas-spectra/flight/";
const a4 = "acoustics.standard-pitch.a4-440hz";
const quartz = "timekeeping.quartz-wristwatch.resonance";
const tick = "timekeeping.quartz-wristwatch.one-second-tick";
const hair = "hearing.cochlea.hair-cell-electrical-signal";
const nerve = "hearing.auditory-nerve.electrical-signal";
const cardiac = ["cardiology.ventricular-activation.resting-adult", "cardiology.arterial-pulse.resting-adult", "wearable.ppg.resting-adult-optical-variation", "wearable.ppg.resting-adult-pulse"];
const shell = (page: Page) => page.locator(".flight-experience");
const panel = (page: Page) => page.getByRole("region", { name: "Guided flight journey", exact: true });
const coord = async (page: Page) => Number(await shell(page).getAttribute("data-coordinate"));
async function ready(page: Page, search = "") {
  await page.goto(route + search);
  await expect(shell(page)).toHaveAttribute("data-ready", "true");
  await expect(shell(page)).toHaveAttribute("data-renderer", "ready", { timeout: 25000 });
}
async function start(page: Page, id: string) {
  await page.locator("#flight-journey-picker").click();
  await page.locator(`[data-start-journey="${id}"]`).click();
  await expect(panel(page)).toHaveAttribute("data-journey-id", id);
}
async function expectStage(page: Page, id: string) {
  await expect(panel(page)).toHaveAttribute("data-stage-id", id);
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", id);
  await expect.poll(() => new URL(page.url()).searchParams.get("stage")).toBe(id);
}

test("free Flight stays quiet until a journey is requested, and every cardiac stage is reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  await expect(panel(page)).toHaveCount(0);
  expect(await page.locator(".flight-label").count()).toBeLessThanOrEqual(3);
  const canvas = await page.locator(".flight-canvas canvas").elementHandle();
  await page.getByRole("link", { name: "Follow the signal: heart → wearable", exact: true }).click();
  expect(new URL(page.url()).pathname).toBe(route);
  for (let i = 0; i < cardiac.length; i++) {
    if (i) await panel(page).getByRole("button", { name: "Next stage", exact: false }).click();
    await expectStage(page, cardiac[i]);
    expect(await page.locator(".flight-label").count()).toBeLessThanOrEqual(3);
  }
  await expect(panel(page).getByRole("button", { name: /Next stage/ })).toBeDisabled();
  expect(await canvas!.evaluate((el) => el.isConnected)).toBe(true);
  await page.locator(".flight-journey-connection summary").click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/screenshots/flight-journey-cardiac.png", fullPage: true });
  await page.locator(".flight-journey-connection").screenshot({ path: "artifacts/screenshots/flight-journey-edge-evidence.png" });
});

test("quartz division travels backwards in frequency while stage order moves forwards", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); await ready(page); await start(page, "quartz-clock");
  await expectStage(page, quartz); expect(await coord(page)).toBe(Math.log10(32768));
  await expect(panel(page).getByRole("button", { name: /Previous stage/ })).toBeDisabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/screenshots/flight-journey-quartz.png", fullPage: true });
  await panel(page).getByRole("button", { name: /Next stage/ }).click();
  await expectStage(page, tick); expect(await coord(page)).toBe(0);
  await expect(page.locator(".flight-journey-connection")).toHaveAttribute("data-edge-id", "relationship.quartz-wristwatch.divided-to-one-hz");
  await expect(page.locator(".flight-journey-connection")).toContainText("32,768");
});

test("unpositioned stages remain inspectable without moving the camera or borrowing a frequency", async ({ page }) => {
  await ready(page); await start(page, "sound-to-nerve");
  const at = await coord(page);
  await panel(page).getByRole("button", { name: /Next stage/ }).click(); await expectStage(page, hair);
  expect(await coord(page)).toBe(at);
  await expect(panel(page)).toContainText("No frequency assigned");
  await expect(page.locator(`.flight-label[data-record-id="${hair}"]`)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Return to selection", exact: true })).toHaveCount(0);
  await expect(page.locator(".flight-journey-connection")).toHaveAttribute("data-owner-id", hair);
  await page.locator(".flight-journey-connection summary").click();
  await expect(page.locator('.flight-journey-connection [data-source-id="source.nidcd.how-we-hear"]')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/screenshots/flight-journey-unspecified.png", fullPage: true });
  await panel(page).getByRole("button", { name: /Next stage/ }).click(); await expectStage(page, nerve);
  expect(await coord(page)).toBe(at);
  const href = await panel(page).getByRole("link", { name: /Full journey/ }).getAttribute("href");
  expect(new URL(href!, "https://example.test").searchParams.get("stage")).toBe(nerve);
});

test("stage buttons preserve focus and exact stage IDs across reload and browser history", async ({ page }) => {
  await ready(page); await start(page, "sound-to-nerve");
  const next = panel(page).getByRole("button", { name: /Next stage/ });
  await next.focus(); await next.press("Enter"); await expectStage(page, hair); await expect(next).toBeFocused();
  await page.goBack(); await expectStage(page, a4);
  await page.goForward(); await expectStage(page, hair);
  const at = await coord(page); await page.reload();
  await expect(shell(page)).toHaveAttribute("data-renderer", "ready"); await expectStage(page, hair);
  expect(await coord(page)).toBe(at);
  await panel(page).getByLabel("Journey stage").selectOption(nerve); await expectStage(page, nerve);
});

test("Return to browsing restores the exact pre-journey view, including after reload", async ({ page }) => {
  const at = 3.123456789012345;
  await ready(page, `?at=${at}&entity=${a4}&detail=observations`);
  await page.getByLabel("Find a phenomenon").fill("quartz");
  await start(page, "cardiac-sensing"); await expectStage(page, cardiac[0]);
  await page.reload(); await expect(shell(page)).toHaveAttribute("data-renderer", "ready");
  await panel(page).getByRole("button", { name: "Return to browsing", exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  expect(await coord(page)).toBe(at);
  await expect(shell(page)).toHaveAttribute("data-detail-mode", "observations");
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", a4);
  await expect(page.getByLabel("Find a phenomenon")).toHaveValue("quartz");
  await expect(page.locator("#flight-journey-picker")).toBeFocused();
  expect(new URL(page.url()).searchParams.has("journey")).toBe(false);
});

test("free camera movement does not advance stages and unrelated selection leaves the guide", async ({ page }) => {
  await ready(page); await start(page, "quartz-clock");
  const rail = page.getByRole("region", { name: "Frequency flight navigation", exact: true });
  await rail.focus(); await rail.press("End");
  await expectStage(page, quartz);
  await panel(page).getByRole("button", { name: /Next stage/ }).click(); await expectStage(page, tick);
  expect(await coord(page)).toBe(0);
  await page.getByLabel("Find a phenomenon").fill("A4");
  await page.locator(`.flight-records [data-record-id="${a4}"]`).click();
  await expect(panel(page)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("stage")).toBe(false);
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", a4);
  await page.goBack(); await expectStage(page, tick);
});

test("direct and malformed links validate journey membership rather than trusting a conflicting entity", async ({ page }) => {
  await ready(page, `?journey=quartz-clock&stage=${tick}&entity=${a4}`);
  await expectStage(page, tick); expect(await coord(page)).toBe(0);
  await ready(page, `?journey=quartz-clock&stage=${hair}`); await expectStage(page, quartz);
  await ready(page, `?journey=missing&stage=${hair}&at=bad`);
  await expect(panel(page)).toHaveCount(0); expect(Number.isFinite(await coord(page))).toBe(true);
});

test("reduced motion keeps guided navigation discrete and leaves scroll flight disabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await ready(page); await start(page, "quartz-clock");
  await expect(page.getByLabel("Scroll to fly")).not.toBeChecked();
  await panel(page).getByRole("button", { name: /Next stage/ }).click(); await expectStage(page, tick);
  expect(await coord(page)).toBe(0);
  await page.waitForTimeout(250); expect(await coord(page)).toBe(0);
});

test("guided journeys and original evidence work when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: any[]) {
      if (kind === "webgl2" || kind === "webgl") return null;
      return (original as Function).call(this, kind, ...args);
    } as typeof original;
  });
  await page.goto(route); await expect(shell(page)).toHaveAttribute("data-renderer", "unavailable");
  await start(page, "sound-to-nerve");
  await panel(page).getByRole("button", { name: /Next stage/ }).click(); await expectStage(page, hair);
  await expect(panel(page)).toContainText("No frequency assigned");
  await expect(page.locator(".flight-journey-connection")).toContainText("physical");
  await expect(page.locator(".flight-canvas canvas")).toHaveCount(0);
});

test.describe("touch guided Flight", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("journey controls precede the corridor on mobile and work with native taps", async ({ page }) => {
    await ready(page); await page.locator("#flight-journey-picker").tap();
    await page.locator('[data-start-journey="quartz-clock"]').tap(); await expectStage(page, quartz);
    const control = await panel(page).boundingBox(), stage = await page.locator(".flight-theater").boundingBox();
    expect(control!.y + control!.height).toBeLessThanOrEqual(stage!.y);
    const next = panel(page).getByRole("button", { name: /Next stage/ });
    expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await next.tap(); await expectStage(page, tick); expect(await coord(page)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator(".flight-label").count()).toBeLessThanOrEqual(2);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "artifacts/screenshots/flight-journey-mobile.png", fullPage: true });
    await panel(page).screenshot({ path: "artifacts/screenshots/flight-journey-mobile-controls.png" });
    await panel(page).getByRole("button", { name: "Return to browsing", exact: true }).tap();
    await expect(panel(page)).toHaveCount(0);
  });
});
