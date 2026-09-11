import { expect, test } from "@playwright/test";

test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
test("expanded observations stay after the lens and before the mobile chart", async ({ page }) => {
  await page.goto("/atlas-spectra/explore/?lane=Biological&center=0.111&span=1.2");
  const shell = page.locator(".atlas-workspace");
  await expect(shell).toHaveAttribute("data-ready", "true");
  const card = page.locator('.plot-label[data-group-id="heart-activity"]');
  const before = await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan]);
  await card.tap();
  const panel = page.getByRole("region", { name: "Heart activity observations", exact: true });
  await expect(panel).toBeVisible();
  const lens = await page.locator(".atlas-probe-controls").boundingBox();
  const box = await panel.boundingBox();
  const chart = await page.locator(".canvas-frame").boundingBox();
  expect(lens).not.toBeNull(); expect(box).not.toBeNull(); expect(chart).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(lens!.y + lens!.height);
  expect(box!.y + box!.height).toBeLessThanOrEqual(chart!.y);
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "artifacts/screenshots/atlas-process-mobile-page.png", fullPage: true });
  await panel.getByRole("button", { name: "Collapse observations", exact: true }).tap();
  await expect(card).toHaveCount(1);
  await expect(shell).toHaveAttribute("data-lane", "Biological");
  expect(await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan])).toEqual(before);
});
