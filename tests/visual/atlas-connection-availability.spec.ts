import { expect, test } from "@playwright/test";

test("connection framing requires a positioned selection and at least one positioned peer", async ({ page }) => {
  await page.goto("/atlas-spectra/explore/");
  const shell = page.locator(".atlas-workspace");
  await expect(shell).toHaveAttribute("data-ready", "true");
  await page.locator('.plot-label[data-record-id="acoustics.standard-pitch.a4-440hz"]').click();
  const frame = page.getByRole("button", { name: "Frame connections", exact: true });
  await expect(frame).toBeDisabled();
  await expect(page.locator(".atlas-context-connection-controls")).toContainText("No connection has both endpoints positioned");
  const before = await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan]);
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("hearing.cochlea.hair-cell-electrical-signal");
  await page.getByRole("region", { name: "Search results", exact: true }).getByRole("button").click();
  await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", "hearing.cochlea.hair-cell-electrical-signal");
  await expect(frame).toBeDisabled();
  await expect(page.locator(".atlas-value strong")).toHaveText("Unpositioned");
  expect(await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan])).toEqual(before);
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("timekeeping.quartz-wristwatch.resonance");
  await page.getByRole("region", { name: "Search results", exact: true }).getByRole("button").click();
  await expect(frame).toBeEnabled();
  await frame.click(); await expect(shell).toHaveAttribute("data-moving", "false");
  await expect(page.locator(".atlas-recorded-links [data-relationship-id]").first()).toBeAttached();
});
