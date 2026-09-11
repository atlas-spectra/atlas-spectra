import { expect, test, type Page } from "@playwright/test";

// The overview capture fits below the real sticky site header on desktop.
// Mobile evidence uses the full page instead of clipping an oversized element.
test.use({ viewport: { width: 1440, height: 1100 } });
const route = "/atlas-spectra/flight/";
const quartz = "timekeeping.quartz-wristwatch.resonance";
const tick = "timekeeping.quartz-wristwatch.one-second-tick";
const electrical = "cardiology.ventricular-activation.resting-adult";
const arterial = "cardiology.arterial-pulse.resting-adult";
const sensor = "wearable.ppg.resting-adult-pulse";
const hair = "hearing.cochlea.hair-cell-electrical-signal";
const nerve = "hearing.auditory-nerve.electrical-signal";
const root = (page: Page) => page.locator(".flight-experience");
const trace = (page: Page) => page.locator(".flight-connection-trace");
async function ready(page: Page, search = "", renderer = "ready") {
  await page.goto(route + search);
  await expect(root(page)).toHaveAttribute("data-ready", "true");
  await expect(root(page)).toHaveAttribute("data-renderer", renderer, { timeout: 25000 });
}
async function start(page: Page, id: string) {
  await page.locator(".flight-journey-picker > summary").click();
  await page.locator(`[data-start-journey="${id}"]`).click();
}
async function open(page: Page) { await trace(page).locator(":scope > summary").click(); await expect(trace(page)).toHaveJSProperty("open", true); }
async function coordinate(page: Page) { return root(page).getAttribute("data-coordinate"); }
async function aligned(page: Page) {
  // Compare the geometry's screen coordinate, not the differently styled stroke
  // edges included in Playwright's painted bounding boxes. Keep <0.05px precision.
  const positions = await trace(page).locator("[data-trace-mark]").evaluateAll((marks) => {
    const originals = Array.from(document.querySelectorAll<SVGGraphicsElement>("[data-overview-record-id]"));
    const rawX = (node: Element) => Number(node.getAttribute(node.tagName.toLowerCase() === "line" ? "x1" : "x"));
    const screenX = (node: SVGGraphicsElement) => {
      const matrix = node.getScreenCTM();
      if (!matrix) throw new Error("Expected a rendered SVG coordinate transform");
      return new DOMPoint(rawX(node), 0).matrixTransform(matrix).x;
    };
    return marks.map((node) => {
      const mark = node as SVGGraphicsElement;
      const id = mark.closest("[data-trace-record-id]")?.getAttribute("data-trace-record-id");
      const original = originals.find((candidate) => candidate.getAttribute("data-overview-record-id") === id && rawX(candidate) === rawX(mark));
      if (!original || !mark.ownerSVGElement || !original.ownerSVGElement) throw new Error("Missing matching original scale mark");
      const a = mark.ownerSVGElement.getBoundingClientRect(), b = original.ownerSVGElement.getBoundingClientRect();
      return { traceX: screenX(mark), overviewX: screenX(original), traceOrigin: a.x, overviewOrigin: b.x, traceWidth: a.width, overviewWidth: b.width };
    });
  });
  for (const position of positions) {
    expect(position.traceX).toBeCloseTo(position.overviewX, 1);
    expect(position.traceOrigin).toBeCloseTo(position.overviewOrigin, 1);
    expect(position.traceWidth).toBeCloseTo(position.overviewWidth, 1);
  }
}
async function captureOverview(page: Page, name: string) {
  const overview = page.locator(".flight-depth-overview");
  await overview.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  const box = await overview.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(70);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await overview.screenshot({ path: `artifacts/screenshots/${name}.png` });
}

test("trace is opt-in, camera-stable and does not add corridor labels or replace its canvas", async ({ page }) => {
  await ready(page); await expect(trace(page)).toHaveCount(0);
  await start(page, "quartz-clock"); await expect(trace(page)).toHaveJSProperty("open", false);
  const before = await coordinate(page), labels = await page.locator(".flight-label").count();
  await page.locator(".flight-canvas canvas").evaluate((el: HTMLElement) => { el.dataset.traceIdentity = "same"; });
  const toggle = trace(page).locator(":scope > summary"); await toggle.focus(); await toggle.press("Enter");
  await expect(trace(page)).toHaveJSProperty("open", true); expect(await coordinate(page)).toBe(before);
  expect(await page.locator(".flight-label").count()).toBe(labels);
  await expect(page.locator(".flight-canvas canvas")).toHaveAttribute("data-trace-identity", "same");
  await toggle.press("Enter"); await expect(trace(page)).toHaveJSProperty("open", false); expect(await coordinate(page)).toBe(before);
});

test("quartz traces a lower-frequency target on exactly the same full-atlas scale", async ({ page }) => {
  await ready(page, "?journey=quartz-clock"); await open(page);
  await expect(trace(page)).toHaveAttribute("data-placement", "lower");
  const source = trace(page).locator('[data-trace-role="source"] [data-trace-mark]');
  const target = trace(page).locator('[data-trace-role="target"] [data-trace-mark]');
  await expect(source).toHaveAttribute("data-log-low", String(Math.log10(32768)));
  await expect(target).toHaveAttribute("data-log-low", "0"); await aligned(page);
  expect((await target.boundingBox())!.x).toBeLessThan((await source.boundingBox())!.x);
  await expect(trace(page)).toContainText("B is lower on the frequency scale");
  await expect(trace(page).locator(".flight-connection-value").first()).toHaveCSS("font-size", "15px");
  await captureOverview(page, "flight-connection-quartz");
  await trace(page).getByRole("button", { name: "Inspect target", exact: true }).click();
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", tick); expect(await coordinate(page)).toBe("0");
  await expect(root(page)).toHaveAttribute("data-guided", "true");
});

test("equal cardiac extents stay separately labeled and stepping updates the actual edge", async ({ page }) => {
  await ready(page, "?journey=cardiac-sensing"); await open(page);
  await expect(trace(page)).toHaveAttribute("data-placement", "same-extent");
  const marks = trace(page).locator("[data-trace-mark]"); await expect(marks).toHaveCount(2);
  expect(await marks.nth(0).getAttribute("data-log-low")).toBe(await marks.nth(1).getAttribute("data-log-low"));
  expect(await marks.nth(0).getAttribute("data-log-high")).toBe(await marks.nth(1).getAttribute("data-log-high"));
  const boxes = await marks.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; }));
  expect(boxes[0].x).toBe(boxes[1].x); expect(boxes[0].width).toBe(boxes[1].width); expect(boxes[0].y).not.toBe(boxes[1].y);
  await expect(trace(page)).toContainText("different observations"); await aligned(page);
  await captureOverview(page, "flight-connection-cardiac");
  await page.getByRole("combobox", { name: "Journey stage" }).selectOption(sensor);
  await expect(trace(page)).toHaveJSProperty("open", true);
  await expect(trace(page)).toHaveAttribute("data-edge-id", "relationship.ppg-optical-to-electrical");
  await expect(trace(page).locator('[data-trace-role="target"]')).toHaveAttribute("data-trace-record-id", sensor);
  const evidence = page.getByRole("region", { name: "Journey connection evidence" });
  expect(await trace(page).getAttribute("data-owner-id")).toBe(await evidence.getAttribute("data-owner-id"));
  const link = trace(page).getByRole("link", { name: "Evidence for this connection" });
  expect(await link.getAttribute("href")).toBe(`#${await evidence.getAttribute("id")}`);
  await link.click(); await expect(evidence).toBeFocused();
  await evidence.locator("summary").click(); await expect(evidence).toContainText("Sources resolved from");
  await evidence.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await evidence.screenshot({ path: "artifacts/screenshots/flight-connection-evidence.png" });
});

test("unknown endpoints have no plotted mark and can still be inspected without moving the camera", async ({ page }) => {
  await ready(page, "?journey=sound-to-nerve"); await open(page);
  const before = await coordinate(page);
  await expect(trace(page)).toHaveAttribute("data-placement", "unpositioned");
  await expect(trace(page).locator('[data-trace-role="target"] [data-trace-mark]')).toHaveCount(0);
  await trace(page).getByRole("button", { name: "Inspect target", exact: true }).click();
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", hair);
  expect(await coordinate(page)).toBe(before); await expect(trace(page)).toContainText("does not inherit its peer's value");
  await captureOverview(page, "flight-connection-unpositioned");
  await page.getByRole("combobox", { name: "Journey stage" }).selectOption(nerve);
  await expect(trace(page).locator("[data-trace-mark]")).toHaveCount(0); expect(await coordinate(page)).toBe(before);
});

test("trace disclosure clears on exit and changing journeys, without losing history or endpoint focus", async ({ page }) => {
  await ready(page, "?journey=cardiac-sensing"); await open(page);
  const target = trace(page).getByRole("button", { name: "Inspect target", exact: true }); await target.focus(); await target.press("Enter");
  await expect(target).toBeFocused(); await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", arterial);
  await page.goBack(); await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", electrical);
  await expect(trace(page)).toHaveAttribute("data-edge-id", "relationship.ventricular-activation-to-arterial-pulse");
  await start(page, "quartz-clock"); await expect(trace(page)).toHaveJSProperty("open", false); await open(page);
  await page.getByRole("button", { name: "Return to browsing", exact: true }).click(); await expect(trace(page)).toHaveCount(0);
  await start(page, "quartz-clock"); await expect(trace(page)).toHaveJSProperty("open", false);
});

test("reload and unrelated selection cannot leave stale tracing or change a precise camera coordinate", async ({ page }) => {
  const at = "3.123456789012345";
  await ready(page, `?journey=quartz-clock&stage=${quartz}&at=${at}`); await open(page);
  expect(await coordinate(page)).toBe(at); await page.reload(); await expect(root(page)).toHaveAttribute("data-ready", "true");
  await expect(trace(page)).toHaveJSProperty("open", false); expect(await coordinate(page)).toBe(at);
  await open(page); await page.locator('.flight-overview-shortcuts [data-jump-id="acoustics.standard-pitch.a4-440hz"]').click();
  await expect(trace(page)).toHaveCount(0); await expect(root(page)).toHaveAttribute("data-guided", "false");
});

test("trace remains usable with reduced motion and no WebGL", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { value: function(kind: string, ...args: unknown[]) {
      return kind.startsWith("webgl") ? null : Reflect.apply(original, this, [kind, ...args]);
    } });
  });
  await ready(page, "?journey=quartz-clock", "unavailable"); await open(page);
  await expect(page.getByLabel("Scroll to fly")).not.toBeChecked();
  await trace(page).getByRole("button", { name: "Inspect target", exact: true }).click();
  expect(await coordinate(page)).toBe("0"); await expect(trace(page).locator("[data-trace-mark]")).toHaveCount(2);
  await expect(root(page)).toHaveAttribute("data-renderer", "unavailable");
});

test.describe("touch connection trace", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("native taps expose the two rows without overflow at 390 and 320 pixels", async ({ page }) => {
    await ready(page, "?journey=cardiac-sensing");
    await trace(page).locator(":scope > summary").tap(); await expect(trace(page)).toHaveJSProperty("open", true);
    await trace(page).getByRole("button", { name: "Inspect target", exact: true }).tap();
    await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", arterial);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await aligned(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const icon of await trace(page).locator(".phenomenon-symbol svg").all()) {
        const box = await icon.boundingBox(), parent = await icon.locator("..").boundingBox();
        expect(box!.width).toBeLessThanOrEqual(parent!.width); expect(box!.height).toBeLessThanOrEqual(parent!.height);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: "artifacts/screenshots/flight-connection-mobile.png", fullPage: true });
  });
});
