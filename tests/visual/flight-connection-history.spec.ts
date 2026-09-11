import { expect, test } from "@playwright/test";

test("inspecting connection evidence preserves the pre-journey browsing snapshot and history", async ({ page }) => {
  const at = "3.123456789012345", id = "acoustics.standard-pitch.a4-440hz";
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/atlas-spectra/flight/?at=${at}&entity=${id}&detail=observations`);
  await expect(page.locator(".flight-experience")).toHaveAttribute("data-ready", "true");
  await page.getByLabel("Find a phenomenon").fill("A4");
  await page.locator(".flight-journey-picker > summary").click();
  await page.locator('[data-start-journey="quartz-clock"]').click();
  await page.locator(".flight-connection-trace > summary").click();
  await expect.poll(async () => page.evaluate(() => history.state?.atlasFlightReturn?.at)).toBe(Number(at));
  const saved = await page.evaluate(() => ({ length: history.length, returnView: history.state.atlasFlightReturn, hash: location.hash }));
  await page.getByRole("link", { name: "Evidence for this connection" }).click();
  await expect(page.getByRole("region", { name: "Journey connection evidence" })).toBeFocused();
  expect(await page.evaluate(() => ({ length: history.length, returnView: history.state.atlasFlightReturn, hash: location.hash }))).toEqual(saved);
  await page.getByRole("button", { name: "Return to browsing", exact: true }).click();
  await expect(page.locator(".flight-experience")).toHaveAttribute("data-coordinate", at);
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", id);
  await expect(page.locator(".flight-experience")).toHaveAttribute("data-detail-mode", "observations");
  await expect(page.getByLabel("Find a phenomenon")).toHaveValue("A4");
});
