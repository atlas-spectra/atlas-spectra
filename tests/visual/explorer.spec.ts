import { expect, test, type Locator } from "@playwright/test";

const screenshotDir = "artifacts/screenshots";
// These browser regressions intentionally move away from Fit all before testing pan/zoom clamps.

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
  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  const zoomOut = page.getByRole("button", { name: "Zoom out" });
  const fitAll = page.getByRole("button", { name: "Fit all" });

  await expect(shell).toBeVisible();
  await expect(labels.first()).toBeVisible();
  await expect(fitAll).toBeVisible();

  await page.screenshot({ path: `${screenshotDir}/explorer-overview.png`, fullPage: true });

  await labels.first().hover();
  await expect(page.locator(".plot-tooltip")).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/explorer-hover-label.png`, fullPage: true });

  const initial = await viewState(shell);
  await zoomIn.click();
  await zoomIn.click();
  await zoomIn.click();
  let state = await viewState(shell);
  expect(state.span).toBeLessThan(initial.span - 0.01);
  const zoomedSpan = state.span;

  await canvas.focus();
  for (let index = 0; index < 80; index += 1) await page.keyboard.press("ArrowLeft");
  state = await viewState(shell);
  expect(Math.abs((state.center - state.span / 2) - state.min)).toBeLessThan(0.01);
  expect(state.center + state.span / 2).toBeLessThanOrEqual(state.max + 0.002);
  await expect(labels.first()).toBeVisible();

  for (let index = 0; index < 160; index += 1) await page.keyboard.press("ArrowRight");
  state = await viewState(shell);
  expect(Math.abs((state.center + state.span / 2) - state.max)).toBeLessThan(0.01);
  expect(state.center - state.span / 2).toBeGreaterThanOrEqual(state.min - 0.002);
  await expect(labels.first()).toBeVisible();

  await zoomOut.click();
  state = await viewState(shell);
  expect(state.span).toBeGreaterThan(zoomedSpan + 0.01);
  for (let index = 0; index < 30; index += 1) await zoomOut.click();
  state = await viewState(shell);
  expect(Math.abs(state.span - (state.max - state.min))).toBeLessThan(0.01);
  await expect(labels.first()).toBeVisible();

  await zoomIn.click();
  state = await viewState(shell);
  expect(state.span).toBeLessThan(state.max - state.min - 0.01);
  await fitAll.click();
  state = await viewState(shell);
  expect(Math.abs(state.span - (state.max - state.min))).toBeLessThan(0.01);
  await page.screenshot({ path: `${screenshotDir}/explorer-fit-all.png`, fullPage: true });

  for (let index = 0; index < 20; index += 1) await zoomIn.click();
  const minimumZoom = await viewState(shell);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.9, box!.y + box!.height * 0.5);
  await page.mouse.wheel(0, -1600);
  await page.mouse.wheel(0, -1600);
  const afterExtraWheelZoom = await viewState(shell);
  expect(Math.abs(afterExtraWheelZoom.span - minimumZoom.span)).toBeLessThan(0.002);
  expect(Math.abs(afterExtraWheelZoom.center - minimumZoom.center)).toBeLessThan(0.002);
});

test("mobile explorer fits the visible frame and retains browse controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/atlas-spectra/explore/");

  const frame = page.locator(".canvas-frame");
  const canvas = page.locator(".frequency-canvas");
  await expect(page.locator(".plot-label").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit all" })).toBeVisible();

  const frameBox = await frame.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(frameBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeLessThanOrEqual(frameBox!.width + 1);

  const state = await viewState(page.locator(".explorer-shell"));
  expect(state.center - state.span / 2).toBeGreaterThanOrEqual(state.min - 0.002);
  expect(state.center + state.span / 2).toBeLessThanOrEqual(state.max + 0.002);

  await page.screenshot({ path: `${screenshotDir}/explorer-mobile.png`, fullPage: true });
});
