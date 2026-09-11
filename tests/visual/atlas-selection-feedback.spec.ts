import { expect, test } from "@playwright/test";

const route = "/atlas-spectra/explore/";
const heart = "biology.heart.resting-adult-rate";
const alpha = "neuroscience.eeg.alpha-band";

test("switching from a traced record clears hidden emphasis, including on return", async ({ page }) => {
  await page.goto(`${route}?center=1&span=4&entity=${heart}`);
  await expect(page.locator(".atlas-workspace")).toHaveAttribute("data-ready", "true");
  const trace = page.getByRole("button", { name: "Trace recorded connections", exact: true });
  await trace.click();
  await expect(trace).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".plot-label.is-context-muted").first()).toBeVisible();
  const unconnected = page.locator(`.plot-label[data-record-id="${alpha}"]`);
  await unconnected.click();
  await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", alpha);
  await expect(trace).toHaveCount(0);
  await expect(page.locator(".plot-label.is-context-muted")).toHaveCount(0);
  await expect(page.locator(".atlas-recorded-links")).toHaveCount(0);
  await page.locator(`.plot-label[data-record-id="${heart}"]`).click();
  await expect(trace).toHaveAttribute("aria-pressed", "false");
  await trace.click();
  await page.getByRole("button", { name: "Close detail panel", exact: true }).click();
  await expect(page.locator(".plot-label.is-context-muted")).toHaveCount(0);
  await expect(page.locator(".atlas-recorded-links")).toHaveCount(0);
});

test("selection status changes for keyboard and search, not for pointer inspection", async ({ page }) => {
  await page.goto(`${route}?center=1&span=4`);
  await expect(page.locator(".atlas-workspace")).toHaveAttribute("data-ready", "true");
  const status = page.locator(".atlas-selection-status");
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveAttribute("aria-atomic", "true");
  const card = page.locator(`.plot-label[data-record-id="${heart}"]`);
  await card.focus(); await card.press("Enter");
  await expect(card).toBeFocused();
  await expect(status).toContainText("Selected Heartbeat. Beats counted.");
  const announced = await status.textContent();
  await page.locator(`.plot-label[data-record-id="${alpha}"]`).hover();
  await expect(status).toHaveText(announced!);
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("ECG");
  await page.getByRole("region", { name: "Search results" }).getByRole("button").first().click();
  await expect(status).toContainText("Selected Heart electricity. Ventricular activations.");
  await page.getByRole("button", { name: "Close detail panel", exact: true }).click();
  await expect(status).toHaveText("No phenomenon selected.");
});
