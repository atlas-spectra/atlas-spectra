import { expect, test } from "@playwright/test";
const route = "/atlas-spectra/connections/";
const heart = "biology.heart.resting-adult-rate", edge = "relationship.heart-lower-bound-to-quartz-one-hz";
test("search and empty-category recovery leave focus on a stable native control", async ({ page }) => {
  await page.goto(route); await expect(page.locator(".connections-app")).toHaveAttribute("data-ready", "true");
  const search = page.getByLabel("Find an observation", { exact: true }); await search.fill("ECG");
  const result = page.locator('[data-search-record="cardiology.ventricular-activation.resting-adult"]'); await result.focus(); await result.press("Enter");
  await expect(page.getByLabel("Start with an observation", { exact: true })).toBeFocused();
  await search.fill("nothing-xyz-xyz"); const clear = page.getByRole("button", { name: "Clear search", exact: true }); await clear.focus(); await clear.press("Enter"); await expect(search).toBeFocused();
  await page.goto(`${route}?entity=${heart}&kind=physical`); await expect(page.locator(".connections-app")).toHaveAttribute("data-ready", "true");
  const recover = page.getByRole("button", { name: "Show all types", exact: true }); await recover.focus(); await recover.press("Enter");
  await expect(page.getByRole("button", { name: "All types", exact: true })).toBeFocused();
});
test("reselecting the active link or filter does not fill history with duplicate entries", async ({ page }) => {
  await page.goto(`${route}?entity=${heart}&edge=${edge}`); await expect(page.locator(".connections-app")).toHaveAttribute("data-ready", "true");
  const before = await page.evaluate(() => history.length), url = page.url();
  await page.locator(`[data-edge-choice="${edge}"]`).click(); await page.getByRole("button", { name: "All types", exact: true }).click();
  await page.locator(`.connections-endpoint[data-endpoint-id="${heart}"] button`).click();
  expect(await page.evaluate(() => history.length)).toBe(before); expect(page.url()).toBe(url);
  await expect(page.locator(".connections-app")).toHaveAttribute("data-edge-id", edge);
});
test("continuing from the peer brings its links into view and announces the new browsing perspective", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${route}?entity=${heart}&edge=${edge}`); await expect(page.locator(".connections-app")).toHaveAttribute("data-ready", "true");
  const next = page.getByRole("button", { name: "Continue from Watch tick →", exact: true });
  await next.scrollIntoViewIfNeeded(); await next.focus();
  const before = await page.evaluate(() => scrollY), status = await page.locator(".connections-live").textContent();
  await next.press("Enter");
  const browser = page.getByLabel("Start with an observation", { exact: true });
  await expect(browser).toBeFocused(); await expect(browser).toBeInViewport();
  await expect(browser).toHaveValue("timekeeping.quartz-wristwatch.one-second-tick");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before);
  await expect(page.locator(".connections-app")).toHaveAttribute("data-edge-id", edge);
  await expect(page.locator(".connections-live")).toContainText("Browsing links for Watch tick");
  expect(await page.locator(".connections-live").textContent()).not.toBe(status);
  await expect(page.locator('.connections-edge-list [data-category="physical"]')).toHaveCount(1);
});
