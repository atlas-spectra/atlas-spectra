import { expect, test } from "@playwright/test";
const route = "/atlas-spectra/connections/";
const heart = "biology.heart.resting-adult-rate", tick = "timekeeping.quartz-wristwatch.one-second-tick";
const hair = "hearing.cochlea.hair-cell-electrical-signal", quartz = "timekeeping.quartz-wristwatch.resonance";

test("unpositioned anchors do not acquire a frequency qualifier or imply a completed peer scan", async ({ page }) => {
  await page.goto(`${route}?numbers=overlap&numbers_from=${hair}`);
  const panel = page.locator(".numerical-panel"); await expect(panel).toHaveAttribute("data-numerical-status", "anchor-excluded");
  await expect(panel.locator(".numerical-anchor-card")).toContainText("Unpositioned observation");
  await expect(panel.locator(".numerical-anchor-card")).not.toContainText("Documented frequency coordinate");
  await panel.getByText("Method, exclusions & limits", { exact: true }).click();
  await expect(panel.locator(".numerical-method")).toContainText("Peer comparison was not performed");
});
test("native recorded-link destinations retain the numerical question without stale sibling path state", async ({ page }) => {
  await page.goto(`${route}?entity=${heart}&numbers=overlap&numbers_from=${heart}&path=recorded&path_from=${quartz}&path_to=${tick}`);
  const panel = page.locator(".numerical-panel"); await expect(panel).toHaveAttribute("data-numerical-status", "complete");
  await page.getByRole("combobox", { name: "Path destination observation" }).selectOption(heart);
  const match = panel.locator(`[data-numerical-peer="${tick}"]`);
  await match.getByText("Calculation & original observation evidence", { exact: true }).click();
  const link = match.getByRole("link", { name: /Numerical coincidence · open original/ });
  const destination = new URL(await link.getAttribute("href") ?? "", page.url());
  expect(destination.searchParams.get("numbers_from")).toBe(heart);
  expect(destination.searchParams.has("path")).toBe(false); expect(destination.searchParams.has("path_to")).toBe(false);
  await expect(match).toContainText("standalone pair view");
  // Merely expanding numerical detail does not alter the currently open path.
  await expect(page.locator(".recorded-path-panel")).toHaveAttribute("data-path-to", heart);
});
