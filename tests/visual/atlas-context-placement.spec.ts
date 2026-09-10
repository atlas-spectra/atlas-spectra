import { expect, test } from "@playwright/test";

test("narrow layouts put surrounding context between the lens and chart", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/atlas-spectra/explore/?center=2&span=5");
  await expect(page.locator(".atlas-workspace")).toHaveAttribute("data-ready", "true");
  const lens = await page.locator(".atlas-probe-controls").boundingBox();
  const neighbors = await page.locator(".atlas-neighborhood").boundingBox();
  const chart = await page.locator(".canvas-frame").boundingBox();
  expect(lens).not.toBeNull(); expect(neighbors).not.toBeNull(); expect(chart).not.toBeNull();
  expect(neighbors!.y).toBeGreaterThanOrEqual(lens!.y + lens!.height);
  expect(neighbors!.y + neighbors!.height).toBeLessThan(chart!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const slider = page.getByRole("slider", { name: "Inspect frequency", exact: true });
  await slider.focus(); await slider.press("End");
  await expect(page.locator(".atlas-neighborhood-nearest")).toContainText("Quartz");
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/screenshots/atlas-context-mobile.png", fullPage: true });
});

test("numerical trace explains record-level scope and retains endpoint derivation", async ({ page }) => {
  await page.goto("/atlas-spectra/explore/?center=0.1&span=3&entity=biology.heart.resting-adult-rate");
  await expect(page.locator(".atlas-workspace")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Trace recorded connections", exact: true }).click();
  await expect(page.locator(".atlas-recorded-links")).toContainText("NUMERICAL COINCIDENCE");
  await expect(page.locator(".atlas-links-note")).toContainText("not exact coordinate pairs");
  await page.locator(".atlas-neighborhood-why summary").click();
  await expect(page.locator(".atlas-neighborhood-why")).toContainText("60 beats/minute");
  await expect(page.locator(".atlas-neighborhood-why")).toContainText("mechanism: none");
});
