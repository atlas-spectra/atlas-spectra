import { expect, test, type Page } from "@playwright/test";
const route = "/atlas-spectra/explore/";
const shots = "artifacts/screenshots";
const shell = (page: Page) => page.locator(".atlas-workspace");
const state = (page: Page) => shell(page).evaluate((el: HTMLElement) => ({ center: Number(el.dataset.viewCenter), span: Number(el.dataset.viewSpan), min: Number(el.dataset.boundMin), max: Number(el.dataset.boundMax) }));
async function ready(page: Page, url = route) {
  await page.goto(url); await expect(shell(page)).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".plot-label").first()).toBeVisible();
}
async function containedLabels(page: Page) {
  const frame = await page.locator(".canvas-frame").boundingBox();
  const labels = await page.locator(".plot-label").all();
  expect(labels.length).toBeGreaterThan(0);
  const boxes = await Promise.all(labels.map((label) => label.boundingBox()));
  for (const [i, box] of boxes.entries()) {
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(frame!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
    for (const other of boxes.slice(i + 1)) expect(box!.x < other!.x + other!.width && box!.x + box!.width > other!.x && box!.y < other!.y + other!.height && box!.y + box!.height > other!.y).toBe(false);
  }
}
test("atlas exposes all coincident labels and domain focus frames real data", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  await expect(page.locator(".plot-label")).toHaveCount(14);
  await containedLabels(page);
  const full = await state(page);
  await page.getByRole("group", { name: "Domain focus" }).getByRole("button", { name: "Biological", exact: true }).click();
  expect((await state(page)).span).toBeLessThan(full.span);
  await expect(shell(page)).toHaveAttribute("data-lane", "Biological");
  await expect(page.locator(".atlas-lane-headings > div")).toHaveCount(1);
  await containedLabels(page);
  await page.getByRole("button", { name: "Fit all", exact: true }).click();
  expect((await state(page)).span).toBeCloseTo(full.span, 6);
  await page.getByRole("button", { name: "Fit results", exact: true }).click();
  expect((await state(page)).span).toBeLessThan(full.span);
  await expect.poll(() => page.url()).toContain("lane=Biological");
  await page.reload(); await expect(shell(page)).toHaveAttribute("data-lane", "Biological");
  await page.screenshot({ path: `${shots}/atlas-domain-focus.png`, fullPage: true });
});
test("plot selection stays put and Fit selection frames the selected record", async ({ page }) => {
  await ready(page); const before = await state(page);
  await page.locator(".plot-label").first().click();
  expect(await state(page)).toEqual(before);
  await page.getByRole("button", { name: "Fit selection", exact: true }).click();
  expect((await state(page)).span).toBeLessThan(before.span);
  await expect(page.locator(".atlas-inspector")).not.toHaveAttribute("data-selected-id", "");
});
test("search includes domains and A4 shows its own claim evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("  CLINICAL-NEUROPHYSIOLOGY  ");
  await page.getByRole("region", { name: "Search results" }).getByRole("button").first().click();
  await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", "neuroscience.eeg.alpha-band");
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("A4-like");
  await page.getByRole("region", { name: "Search results" }).getByRole("button").first().click();
  await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", "perception.pitch.a4-reference");
  const reference = page.getByRole("region", { name: "Reference coordinate evidence" });
  await expect(reference).toContainText("established reference · reviewed");
  await expect(page.getByRole("region", { name: "Record provenance" })).toContainText("model derived · reviewed");
  await reference.locator("summary").click();
  await expect(reference.locator("[data-source-id]")).toHaveCount(1);
  await page.waitForFunction(() => new URL(location.href).searchParams.get("entity") === "perception.pitch.a4-reference");
  const exact = (await state(page)).center;
  await page.reload(); await expect(shell(page)).toHaveAttribute("data-ready", "true");
  expect((await state(page)).center).toBe(exact);
  await expect(page.locator(".atlas-value strong")).toHaveText("440 Hz");
  const flight = new URL(await page.locator(".atlas-mode a").getAttribute("href"), "http://localhost");
  expect(Number(flight.searchParams.get("at"))).toBe(exact);
  expect(flight.searchParams.get("entity")).toBe("perception.pitch.a4-reference");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${shots}/atlas-reference-detail.png`, fullPage: true });
});
test("unpositioned records remain inspectable without moving the viewport", async ({ page }) => {
  await ready(page); await page.getByRole("button", { name: "Browse all records", exact: true }).click();
  const before = await state(page);
  await page.locator('.atlas-record-list button[data-record-id="hearing.auditory-nerve.electrical-signal"]').click();
  expect(await state(page)).toEqual(before);
  await expect(page.locator(".atlas-value strong")).toHaveText("Unpositioned");
  await expect(page.getByRole("button", { name: "Fit selection", exact: true })).toBeDisabled();
});
test("overview keyboard navigation reaches both endpoints and wheel zoom does not scroll the page", async ({ page }) => {
  await ready(page); await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const overview = page.getByRole("slider", { name: "Overview position" });
  await overview.focus(); await overview.press("End");
  let s = await state(page); expect(s.center + s.span / 2).toBeCloseTo(s.max, 5);
  await overview.press("Home"); s = await state(page); expect(s.center - s.span / 2).toBeCloseTo(s.min, 5);
  const canvas = page.locator(".frequency-canvas"); await canvas.hover({ position: { x: 240, y: 80 } });
  const scroll = await page.evaluate(() => window.scrollY); const span = s.span;
  await page.mouse.wheel(0, -180);
  await expect.poll(async () => (await state(page)).span).toBeLessThan(span);
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
});
test("an empty search has a recovery path and cannot invent a position", async ({ page }) => {
  await ready(page); const before = await state(page);
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("absent-record-xyz");
  await expect(page.locator(".plot-label")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Fit results", exact: true })).toBeDisabled();
  await expect(page.locator(".atlas-empty")).toBeVisible();
  expect(await state(page)).toEqual(before);
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("");
  await expect(page.locator(".plot-label")).toHaveCount(14);
});
test.describe("touch atlas", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("mobile labels fit and vertical swipes remain native page scrolling", async ({ page, context }) => {
    await ready(page); await containedLabels(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const canvas = page.locator(".frequency-canvas");
    await canvas.scrollIntoViewIfNeeded();
    const b = await canvas.boundingBox(); const y = Math.max(150, Math.min(600, b!.y + b!.height * 0.5));
    const before = await state(page), scroll = await page.evaluate(() => scrollY);
    const session = await context.newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b!.x + 30, y }] });
    for (let i = 1; i <= 6; i++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b!.x + 30, y: y - i * 25 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await session.detach();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll + 20);
    expect((await state(page)).center).toBe(before.center);
    await page.getByRole("group", { name: "Domain focus" }).getByRole("button", { name: "Biological", exact: true }).tap();
    await containedLabels(page); await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${shots}/atlas-mobile-focus.png`, fullPage: true });
  });
});
