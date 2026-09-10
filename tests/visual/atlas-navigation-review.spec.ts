import { expect, test } from "@playwright/test";

const route = "/atlas-spectra/explore/";

test("framing connections releases the old pin and follows the selected observation", async ({ page }) => {
  await page.goto(route);
  const shell = page.locator(".atlas-workspace");
  await expect(shell).toHaveAttribute("data-ready", "true");
  await page.locator('.plot-label[data-record-id="timekeeping.quartz-wristwatch.resonance"]').click();
  const slider = page.getByRole("slider", { name: "Inspect frequency", exact: true });
  await slider.focus(); await slider.press("End");
  const pinned = Number(await page.locator(".atlas-probe-controls").getAttribute("data-probe-log"));
  await expect(page.getByRole("button", { name: "Release lens", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Frame connections", exact: true }).click();
  await expect(shell).toHaveAttribute("data-moving", "false");
  const upper = await shell.evaluate((el: HTMLElement) => Number(el.dataset.viewCenter) + Number(el.dataset.viewSpan) / 2);
  expect(pinned).toBeGreaterThan(upper + 1);
  await expect(page.getByRole("button", { name: "Pin lens", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => Number(await page.locator(".atlas-probe-controls").getAttribute("data-probe-log"))).toBeCloseTo(Math.log10(32768), 10);
  await expect(page.locator(".atlas-recorded-links [data-relationship-id]").first()).toBeAttached();
});

test("Browse all clears both filters, includes unresolved records, and returns to the window", async ({ page }) => {
  await page.goto(`${route}?lane=Biological&center=0.111&span=1.2&detail=observations`);
  const shell = page.locator(".atlas-workspace");
  await expect(shell).toHaveAttribute("data-ready", "true");
  const search = page.getByLabel("Find a phenomenon", { exact: true });
  const rows = page.locator(".atlas-record-list>button");
  await search.fill("ECG"); await expect(rows).toHaveCount(1);
  const before = await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan]);
  await page.getByRole("button", { name: "Browse all records", exact: true }).click();
  await expect(search).toHaveValue(""); await expect(shell).toHaveAttribute("data-lane", "all");
  await expect(rows).toHaveCount(22);
  await expect(page.locator('.atlas-record-list [data-record-id="hearing.auditory-nerve.electrical-signal"]')).toHaveCount(1);
  expect(await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan])).toEqual(before);
  await page.getByRole("button", { name: "Show current window", exact: true }).click();
  expect(await rows.count()).toBeLessThan(22);
  expect(await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan])).toEqual(before);
  await search.fill("no-matching-observation-xyz"); await expect(rows).toHaveCount(0);
  await page.getByRole("button", { name: "Browse all records", exact: true }).click();
  await expect(search).toHaveValue(""); await expect(rows).toHaveCount(22);
});
