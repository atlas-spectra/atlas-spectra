import { expect, test, type Locator } from "@playwright/test";

const screenshotDir = "artifacts/screenshots";

function viewState(locator: Locator) {
  return locator.evaluate((element: HTMLElement) => ({
    center: Number(element.dataset.viewCenter),
    span: Number(element.dataset.viewSpan),
    min: Number(element.dataset.boundMin),
    max: Number(element.dataset.boundMax),
  }));
}

test("labels identify marks and navigation stays inside corpus bounds", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/atlas-spectra/explore/");

  const shell = page.locator(".explorer-shell");
  const labels = page.locator(".plot-label");
  const canvas = page.locator(".frequency-canvas");

  await expect(shell).toBeVisible();
  await expect(labels.first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit all" })).toBeVisible();

  await page.screenshot({ path: `${screenshotDir}/explorer-overview.png`, fullPage: true });

  await labels.first().hover();
  await expect(page.locator(".plot-tooltip")).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/explorer-hover-label.png`, fullPage: true });

  await canvas.focus();
  for (let index = 0; index < 80; index += 1) await page.keyboard.press("ArrowLeft");
  let state = await viewState(shell);
  expect(state.center - state.span / 2).toBeGreaterThanOrEqual(state.min - 0.002);
  expect(state.center + state.span / 2).toBeLessThanOrEqual(state.max + 0.002);
  await expect(labels.first()).toBeVisible();

  for (let index = 0; index < 160; index += 1) await page.keyboard.press("ArrowRight");
  state = await viewState(shell);
  expect(state.center - state.span / 2).toBeGreaterThanOrEqual(state.min - 0.002);
  expect(state.center + state.span / 2).toBeLessThanOrEqual(state.max + 0.002);
  await expect(labels.first()).toBeVisible();

  for (let index = 0; index < 30; index += 1) await page.getByRole("button", { name: "Zoom out" }).click();
  state = await viewState(shell);
  expect(state.span).toBeLessThanOrEqual(state.max - state.min + 0.002);
  await expect(labels.first()).toBeVisible();

  await page.getByRole("button", { name: "Fit all" }).click();
  state = await viewState(shell);
  expect(Math.abs(state.span - (state.max - state.min))).toBeLessThan(0.01);
  await page.screenshot({ path: `${screenshotDir}/explorer-fit-all.png`, fullPage: true });
});

test("mobile explorer retains labels and browse controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/atlas-spectra/explore/");
  await expect(page.locator(".plot-label").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit all" })).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/explorer-mobile.png`, fullPage: true });
});
