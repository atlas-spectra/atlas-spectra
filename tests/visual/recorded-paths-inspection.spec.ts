import { expect, test, type Page } from "@playwright/test";

const electrical = "cardiology.ventricular-activation.resting-adult";
const sensor = "wearable.ppg.resting-adult-pulse";
const route = `/atlas-spectra/connections/?${new URLSearchParams({ path: "recorded", path_from: electrical, path_to: sensor })}`;
const detail = (page: Page) => page.locator("#connections-selected-detail");
const link = (page: Page, step: number) => page.getByRole("link", { name: `Inspect path link ${step} and evidence`, exact: true });

async function ready(page: Page) {
  await page.goto(route);
  await expect(page.locator(".connections-app")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".recorded-path-panel")).toHaveAttribute("data-path-status", "found");
}
async function visibleHeading(page: Page) {
  await expect(detail(page)).toBeFocused();
  await expect.poll(async () => {
    const heading = await page.locator(".connections-meaning h2").boundingBox();
    const header = await page.locator(".site-header").boundingBox();
    const height = page.viewportSize()!.height;
    return !!heading && !!header && heading.y >= header.y + header.height
      && heading.y + heading.height <= height;
  }).toBe(true);
}

test.describe("repeat path inspection on touch screens", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  for (const width of [390, 320]) {
    test(`inspecting the same link at ${width}px reveals the pair again without duplicate history`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await ready(page);
      await link(page, 3).tap(); await visibleHeading(page);
      const before = await page.evaluate(() => ({ url: location.href, entries: history.length }));
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await link(page, 3).tap(); await visibleHeading(page);
      expect(await page.evaluate(() => ({ url: location.href, entries: history.length }))).toEqual(before);
      await expect(page.locator(".recorded-path-panel")).toHaveAttribute("data-path-from", electrical);
      await expect(page.locator(".recorded-path-panel")).toHaveAttribute("data-path-to", sensor);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390) await page.screenshot({ path: "artifacts/screenshots/paths-mobile-inspected.png" });
    });
  }
});

test("keyboard inspection measures the real header instead of assuming a fixed offset", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  // Stress a taller header as could occur with enlarged text or wrapped navigation.
  // This layout fixture is tested but is not used for visual review screenshots.
  await page.addStyleTag({ content: ".site-header { min-height: 190px; }" });
  expect((await page.locator(".site-header").boundingBox())!.height).toBeGreaterThan(150);
  for (const step of [1, 3, 2]) {
    await link(page, step).focus(); await link(page, step).press("Enter");
    await visibleHeading(page);
  }
});

test("native history restores the pair without replaying an explicit inspection scroll", async ({ page }) => {
  await ready(page);
  await link(page, 1).click();
  const first = await page.locator(".connections-app").getAttribute("data-edge-id");
  await link(page, 3).click(); await visibleHeading(page);
  await page.evaluate(() => {
    const original = window.scrollTo.bind(window);
    document.documentElement.dataset.inspectionScrolls = "0";
    window.scrollTo = (...args: Parameters<typeof window.scrollTo>) => {
      document.documentElement.dataset.inspectionScrolls = String(Number(document.documentElement.dataset.inspectionScrolls) + 1);
      Reflect.apply(original, window, args);
    };
  });
  await page.goBack();
  await expect(page.locator(".connections-app")).toHaveAttribute("data-edge-id", first!);
  await expect(page.locator("html")).toHaveAttribute("data-inspection-scrolls", "0");
  await expect(page.locator(".recorded-path-panel")).toHaveAttribute("data-path-from", electrical);
  await expect(page.locator(".recorded-path-panel")).toHaveAttribute("data-path-to", sensor);
});
