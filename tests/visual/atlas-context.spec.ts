import { expect, test, type Page } from "@playwright/test";
const route = "/atlas-spectra/explore/";
const shell = (page: Page) => page.locator(".atlas-workspace");
const probe = async (page: Page) => Number(await page.locator(".atlas-probe-controls").getAttribute("data-probe-log"));
const state = async (page: Page) => shell(page).evaluate((el: HTMLElement) => ({ center: Number(el.dataset.viewCenter), span: Number(el.dataset.viewSpan) }));
async function ready(page: Page, search = "?center=2&span=5") { await page.goto(`${route}${search}`); await expect(shell(page)).toHaveAttribute("data-ready", "true"); }
async function plotPoint(page: Page, ratio: number) {
  const canvas = page.locator(".frequency-canvas");
  await canvas.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 110));
  const b = await canvas.boundingBox(); if (!b) throw new Error("Canvas must exist");
  const left = b.width < 600 ? 88 : 150;
  const p = { x: b.x + left + (b.width - left - 18) * ratio, y: b.y + 23 };
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.matches(".frequency-canvas"), p)).toBe(true);
  return p;
}
async function settled(page: Page) { await expect(shell(page)).toHaveAttribute("data-moving", "false"); }

test("moving the lens changes surrounding records without moving the camera; pin holds it", async ({ page }) => {
  await ready(page); const before = await state(page);
  const a = await plotPoint(page, 0.22); await page.mouse.move(a.x, a.y);
  const low = await probe(page), id = await page.locator(".atlas-neighbor-list button").first().getAttribute("data-neighbor-id");
  const b = await plotPoint(page, 0.8); await page.mouse.move(b.x, b.y);
  await expect.poll(() => probe(page)).toBeGreaterThan(low + 1);
  await expect(page.locator(".atlas-neighbor-list button").first()).not.toHaveAttribute("data-neighbor-id", id!);
  expect(await state(page)).toEqual(before);
  await page.getByRole("button", { name: "Pin lens", exact: true }).click();
  const fixed = await probe(page), c = await plotPoint(page, 0.1);
  await page.mouse.move(c.x, c.y); expect(await probe(page)).toBe(fixed);
  await expect(page.getByRole("button", { name: "Release lens", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Release lens", exact: true }).click();
  const d = await plotPoint(page, 0.2); await page.mouse.move(d.x, d.y);
  await expect.poll(() => probe(page)).toBeLessThan(fixed - 1);
});

test("lens is keyboard accessible and exposes surrounding records outside the active filter", async ({ page }) => {
  await ready(page);
  await page.getByRole("group", { name: "Domain focus" }).getByRole("button", { name: "Biological", exact: true }).click();
  const before = await state(page), slider = page.getByRole("slider", { name: "Inspect frequency", exact: true });
  await slider.focus(); await slider.press("Home"); expect(await probe(page)).toBeCloseTo(before.center - before.span / 2, 8);
  await slider.press("End"); expect(await probe(page)).toBeCloseTo(before.center + before.span / 2, 8);
  expect(await state(page)).toEqual(before);
  await expect(page.locator(".atlas-neighborhood")).toContainText("outside filter");
  await expect(page.locator(".atlas-probe-reading")).toContainText("If periodic");
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: "artifacts/screenshots/atlas-neighborhood.png", fullPage: true });
});

test("landmark travel settles exactly and reduced motion skips camera animation", async ({ page }) => {
  await ready(page, "");
  await page.locator('[data-context-landmark="acoustics.standard-pitch.a4-440hz"]').click(); await settled(page);
  expect((await state(page)).center).toBe(Math.log10(440));
  await expect(page.locator(".atlas-probe-reading>strong")).toHaveText("440 Hz");
  await page.getByRole("button", { name: "Lower landmark", exact: false }).click(); await settled(page);
  expect((await state(page)).center).toBeLessThan(Math.log10(440));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('[data-context-landmark="timekeeping.quartz-wristwatch.resonance"]').click();
  await expect(shell(page)).toHaveAttribute("data-moving", "false"); expect((await state(page)).center).toBe(Math.log10(32768));
});

test("direct camera input interrupts travel and no idle animation resumes", async ({ page }) => {
  await ready(page);
  await page.locator('[data-context-landmark="atomic.cesium-133.hyperfine-transition"]').dispatchEvent("click");
  await page.getByRole("button", { name: "Fit all", exact: true }).dispatchEvent("click");
  await settled(page); const fitted = await state(page);
  await page.waitForTimeout(400); // Detect an uncancelled finite travel, not a readiness sleep.
  expect(await state(page)).toEqual(fitted);
});

test("trace shows only recorded edges and keeps numerical coincidence visibly distinct", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  await page.locator('[data-context-landmark="biology.heart.resting-adult-rate"]').click(); await settled(page);
  await expect(page.locator(".atlas-recorded-links")).toHaveCount(0);
  await page.getByRole("button", { name: "Trace recorded connections", exact: true }).click();
  const numerical = page.locator('[data-relationship-id="relationship.heart-lower-bound-to-quartz-one-hz"]');
  await expect(numerical).toHaveCount(1); await expect(numerical).toHaveAttribute("data-category", "numerical");
  await expect(numerical.locator("path")).toHaveAttribute("stroke-dasharray", "4 5");
  await expect(page.locator(".atlas-recorded-links [data-relationship-id]")).toHaveCount(1);
  await expect(page.locator(".atlas-connection.is-numerical")).toContainText("mechanism: none");
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: "artifacts/screenshots/atlas-recorded-connections.png", fullPage: true });
  await page.getByRole("button", { name: "Trace recorded connections", exact: true }).click();
  await expect(page.locator(".atlas-recorded-links")).toHaveCount(0);
});

test("mobile lens works without hover and keeps the page within its viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
  const slider = page.getByRole("slider", { name: "Inspect frequency", exact: true });
  await slider.focus(); await slider.press("End");
  const s = await state(page); expect(await probe(page)).toBeCloseTo(s.center + s.span / 2, 8);
  await expect(page.getByRole("button", { name: "Release lens", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: "artifacts/screenshots/atlas-lens-mobile.png", fullPage: true });
});

test("record a real interaction clip for review", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: "artifacts/videos", size: { width: 1280, height: 900 } } });
  const page = await context.newPage(), video = page.video();
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:4321${route}?center=2&span=5`); await expect(shell(page)).toHaveAttribute("data-ready", "true");
    for (const id of ["acoustics.standard-pitch.a4-440hz", "biology.heart.resting-adult-rate"]) {
      await page.locator(`[data-context-landmark="${id}"]`).click(); await settled(page);
      for (const ratio of [0.25, 0.65, 0.85]) { const p = await plotPoint(page, ratio); await page.mouse.move(p.x, p.y, { steps: 14 }); await page.waitForTimeout(180); }
    }
    await page.getByRole("button", { name: "Trace recorded connections", exact: true }).click();
    await page.locator(".atlas-probe-controls").evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 80));
    await page.waitForTimeout(650); // Hold the state for the review clip.
    expect(errors).toEqual([]);
  } finally { await context.close(); if (video) await video.saveAs("artifacts/screenshots/atlas-interaction.webm"); }
});
