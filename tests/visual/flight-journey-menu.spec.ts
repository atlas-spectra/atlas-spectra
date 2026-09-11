import { expect, test } from "@playwright/test";
const route = "/atlas-spectra/flight/";

test("journey menu remains on screen at narrow and desktop widths", async ({ page }) => {
  await page.goto(route); await expect(page.locator(".flight-experience")).toHaveAttribute("data-ready", "true");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const picker = page.locator("#flight-journey-picker"); await picker.click();
    const menu = await page.locator(".flight-journey-picker > div").boundingBox();
    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(width);
    for (const button of await page.locator("[data-start-journey]").all()) await expect(button).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await picker.click();
  }
});

test("closing guided record details cannot leave stale journey evidence or URL state", async ({ page }) => {
  await page.goto(`${route}?journey=quartz-clock`);
  await expect(page.locator(".flight-experience")).toHaveAttribute("data-guided", "true");
  await page.getByRole("button", { name: "Close flight detail", exact: true }).click();
  await expect(page.locator(".flight-journey-panel")).toHaveCount(0);
  await expect(page.locator(".flight-journey-connection")).toHaveCount(0);
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", "");
  for (const key of ["journey", "stage", "entity"]) expect(new URL(page.url()).searchParams.has(key)).toBe(false);
});
