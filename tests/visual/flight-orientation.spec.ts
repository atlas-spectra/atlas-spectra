import { expect, test, type Page } from "@playwright/test";
import { COMPACT_FLIGHT_LABEL_HEIGHT } from "../../src/lib/flight-presentation";
const route = "/atlas-spectra/flight/";
const heart = "biology.heart.resting-adult-rate";
const electrical = "cardiology.ventricular-activation.resting-adult";
const arterial = "cardiology.arterial-pulse.resting-adult";
const a4 = "acoustics.standard-pitch.a4-440hz";
const sensors = ["wearable.ppg.resting-adult-optical-variation", "wearable.ppg.resting-adult-pulse"];
const shell = (page: Page) => page.locator(".flight-experience");
const state = (page: Page) => shell(page).evaluate((el: HTMLElement) => [el.dataset.coordinate, el.dataset.min, el.dataset.max]);
async function ready(page: Page, search = "") {
  await page.goto(route + search);
  await expect(shell(page)).toHaveAttribute("data-ready", "true");
  await expect(shell(page)).toHaveAttribute("data-renderer", "ready", { timeout: 25000 });
}
async function checkBoxes(page: Page) {
  const rectangles = await page.locator(".flight-label").evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, height: r.height };
  }));
  const stage = await page.locator(".flight-stage").boundingBox();
  const hud = await page.locator(".flight-hud").boundingBox();
  for (const [i, r] of rectangles.entries()) {
    expect(r.height).toBe(COMPACT_FLIGHT_LABEL_HEIGHT);
    expect(r.left).toBeGreaterThanOrEqual(stage!.x);
    expect(r.right).toBeLessThanOrEqual(stage!.x + stage!.width);
    expect(r.top).toBeGreaterThanOrEqual(hud!.y + hud!.height);
    expect(r.bottom).toBeLessThanOrEqual(stage!.y + stage!.height - 40);
    for (const b of rectangles.slice(i + 1)) expect(r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top).toBe(false);
  }
}

test("Flight discovers one heart process and keeps the numerically coincident watch separate", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  await expect(shell(page)).toHaveAttribute("data-detail-mode", "discover");
  const group = page.locator('.flight-label[data-group-id="heart-activity"]');
  await expect(group).toContainText("Heart activity");
  // Scene names stay compact; the reference quantity remains in the record browser.
  await expect(page.locator('.flight-records [data-group-id="heart-activity"]')).toContainText("60–100 bpm");
  await expect(group).toContainText("3 observations");
  await expect(page.locator(`.flight-label[data-record-id="${electrical}"]`)).toHaveCount(0);
  await expect(page.locator(`.flight-label[data-record-id="${arterial}"]`)).toHaveCount(0);
  await expect(page.locator('.flight-records [data-group-id="heart-activity"]')).toHaveCount(1);
  await expect(page.locator('.flight-records [data-record-id="timekeeping.quartz-wristwatch.one-second-tick"]')).toBeVisible();
  await checkBoxes(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/screenshots/flight-discovery-overview.png", fullPage: true });
});

test("expanding and collapsing observations preserve the camera and their individual evidence", async ({ page }) => {
  await ready(page);
  const before = await state(page), group = page.locator('.flight-label[data-group-id="heart-activity"]');
  await group.focus(); await group.press("Enter");
  const panel = page.getByRole("region", { name: "Heart activity observations", exact: true });
  await expect(panel).toBeVisible(); expect(await state(page)).toEqual(before);
  await expect(panel.locator('[data-basis="established_reference"]')).toHaveCount(1);
  await expect(panel.locator('[data-basis="model_derived"]')).toHaveCount(2);
  await panel.locator(`[data-facet-id="${electrical}"]`).click();
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", electrical);
  expect(await state(page)).toEqual(before);
  await expect(page.locator(`.flight-label[data-record-id="${electrical}"]`)).toHaveClass(/is-selected/);
  await panel.getByRole("button", { name: "Collapse observations" }).click();
  await expect(group).toBeFocused(); expect(await state(page)).toEqual(before);
});

test("comparison mode restores and label rectangles avoid one another and the readout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page, "?at=0.1111111111111111");
  const before = await state(page);
  await page.getByRole("button", { name: "All observations", exact: true }).click();
  await expect(shell(page)).toHaveAttribute("data-detail-mode", "observations");
  expect(await state(page)).toEqual(before);
  await checkBoxes(page);
  await expect.poll(() => new URL(page.url()).searchParams.get("detail")).toBe("observations");
  await page.reload(); await expect(shell(page)).toHaveAttribute("data-renderer", "ready");
  await expect(shell(page)).toHaveAttribute("data-detail-mode", "observations");
  expect(await state(page)).toEqual(before);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/screenshots/flight-observation-labels.png", fullPage: true });
});

test("off-screen selection has a recovery action and Atlas links preserve full precision", async ({ page }) => {
  await ready(page, `?at=3.123456789012345&entity=${a4}`);
  const href = await page.locator(".flight-mode a").getAttribute("href");
  expect(new URL(href!, "https://example.test").searchParams.get("center")).toBe("3.123456789012345");
  const rail = page.getByRole("region", { name: "Frequency flight navigation" });
  await rail.focus(); await rail.press("End");
  await expect(page.locator(".flight-selection-location")).toContainText("Behind this depth window");
  const noteBefore = await page.locator(".flight-status").textContent();
  await page.getByRole("button", { name: "Return to selection", exact: true }).click();
  await expect(page.locator(`.flight-label[data-record-id="${a4}"]`)).toBeVisible();
  expect((await state(page))[0]).toBe(String(Math.log10(440)));
  await expect(page.locator(".flight-hud strong")).toHaveText("440 Hz");
  expect(await page.locator(".flight-status").textContent()).toBe(noteBefore);
});

test("search exposes hidden facets and Browse all escapes the query without losing unresolved records", async ({ page }) => {
  await ready(page);
  await page.getByLabel("Find a phenomenon").fill("  ECG  ");
  const result = page.locator(`.flight-records [data-record-id="${electrical}"]`);
  await expect(result).toBeVisible(); await result.click();
  await expect(page.getByRole("region", { name: "Heart activity observations", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Browse all 22", exact: true }).click();
  await expect(page.getByLabel("Find a phenomenon")).toHaveValue("");
  await expect(page.locator(".flight-records>button")).toHaveCount(22);
  const unknown = page.locator('.flight-records>button[data-positioned="false"]').first();
  const before = await state(page); await unknown.click();
  expect(await state(page)).toEqual(before);
  await expect(page.locator(".flight-selection-location")).toContainText("No coordinate is invented");
  await expect(page.getByRole("button", { name: "Return to selection", exact: true })).toHaveCount(0);
});

test("Discover leaves breathing room without hiding names or scientific overview marks", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  expect(await page.locator(".flight-label").count()).toBeLessThanOrEqual(3);
  await expect(page.locator(".flight-label .flight-landmark-value")).toHaveCount(0);
  await expect(page.locator(".flight-label .flight-landmark-subtitle")).toHaveCount(0);
  await expect(page.locator(".flight-hud > b")).toHaveText("1 per second");
  await expect(page.locator(".flight-hud")).toContainText("Your position on the scale");
  for (const id of sensors) {
    await expect(page.locator(`.flight-label[data-record-id="${id}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-overview-record-id="${id}"]`)).toHaveCount(1);
  }
  await expect(page.locator(".flight-signal-entry")).toContainText("2 sensing stages");
  await checkBoxes(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/screenshots/flight-quiet-overview.png", fullPage: true });
  await page.locator(".flight-stage").screenshot({ path: "artifacts/screenshots/flight-quiet-corridor.png" });
});

test("the overview itself is draggable and named shortcuts restore exact record coordinates", async ({ page }) => {
  await ready(page);
  await expect(shell(page).locator('input[type="range"]')).toHaveCount(1);
  const slider = page.getByRole("slider", { name: /Frequency ruler/ });
  await slider.scrollIntoViewIfNeeded(); const box = await slider.boundingBox();
  const before = Number((await state(page))[0]);
  await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height / 2); await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height / 2, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => Number((await state(page))[0])).toBeGreaterThan(before + 5);
  await page.locator(`.flight-overview-shortcuts [data-jump-id="${a4}"]`).click();
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", a4);
  expect((await state(page))[0]).toBe(String(Math.log10(440)));
  await expect(page.locator(".flight-hud > b")).toHaveText("440 per second");
  await expect.poll(() => new URL(page.url()).searchParams.get("at")).toBe(String(Math.log10(440)));
  await page.reload(); await expect(shell(page)).toHaveAttribute("data-renderer", "ready");
  expect((await state(page))[0]).toBe(String(Math.log10(440)));
  await slider.focus(); await slider.press("Home");
  await expect.poll(async () => Math.abs(Number((await state(page))[0]) - Number((await state(page))[1]))).toBeLessThan(0.011);
  await slider.press("End");
  await expect.poll(async () => Math.abs(Number((await state(page))[0]) - Number((await state(page))[2]))).toBeLessThan(0.011);
});

test("the scale position and heartbeat quantity have distinct meanings and visible conversion help", async ({ page }) => {
  await ready(page);
  const shortcut = page.locator(`.flight-overview-shortcuts [data-jump-id="${heart}"]`);
  await expect(shortcut).toContainText("60–100 bpm");
  await expect(shortcut).not.toContainText("1.29 Hz");
  const before = await state(page);
  await page.locator('.flight-label[data-group-id="heart-activity"]').click();
  expect(await state(page)).toEqual(before);
  await expect(page.locator(".flight-hud > b")).toHaveText("1 per second");
  const reading = page.getByRole("region", { name: "Event rate on the common scale" });
  await expect(reading).toContainText("60–100 beats/min");
  await expect(reading).toContainText("1–1.67 beat events/s");
  await expect(reading).toContainText("not a waveform");
  await page.locator(".flight-scale-help summary").click();
  await expect(page.locator(".flight-scale-help")).toContainText("60 beats/min");
  await expect(page.locator(".flight-scale-help")).toContainText("1 beat/s");
  await expect(page.locator(".flight-scale-help")).toContainText("need not mean evenly spaced beats");
  await page.locator(".flight-scale-help").screenshot({ path: "artifacts/screenshots/flight-unit-help.png" });
  await reading.screenshot({ path: "artifacts/screenshots/flight-heart-rate-context.png" });
});

test("deferred sensing stages remain searchable and independently selectable", async ({ page }) => {
  await ready(page);
  for (const id of sensors) {
    await page.getByLabel("Find a phenomenon").fill("PPG");
    await page.locator(`.flight-records [data-record-id="${id}"]`).click();
    await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", id);
    await expect(page.locator(`.flight-label[data-record-id="${id}"]`)).toBeVisible();
    await expect(page.locator(".flight-rate-context")).toContainText("1–1.67 events/s");
  }
  await ready(page);
  await page.locator(".flight-signal-entry a").click();
  await expect(page).toHaveURL(/\/journeys\/\?journey=cardiac-sensing/);
  await expect(page.locator(".journey-app")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".journey-step")).toHaveCount(4);
});

test("compact perceptual labels still visibly identify claim references", async ({ page }) => {
  await ready(page, "?at=2.6434526764861874&entity=perception.pitch.a4-reference");
  const reference = page.locator('.flight-label[data-record-id="perception.pitch.a4-reference"]');
  await expect(reference).toHaveClass(/is-reference/); await expect(reference).toContainText("Claim reference");
  await expect(page.locator(".flight-rate-context")).toHaveCount(0);
});

test.describe("touch Flight orientation", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("the grouped landmark and depth overview remain usable without hover", async ({ page }) => {
    await ready(page); await checkBoxes(page);
    await expect(page.locator(".flight-depth-overview")).toContainText("Local depth window");
    const before = await state(page);
    await page.locator('.flight-label[data-group-id="heart-activity"]').tap();
    const panel = page.getByRole("region", { name: "Heart activity observations", exact: true });
    await panel.locator(`[data-facet-id="${arterial}"]`).tap();
    await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", arterial);
    await panel.getByRole("button", { name: "Collapse observations" }).tap();
    expect(await state(page)).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "artifacts/screenshots/flight-discovery-mobile.png", fullPage: true });
    await page.locator(".flight-scale").screenshot({ path: "artifacts/screenshots/flight-depth-overview.png" });
  });
  test("mobile uses two compact landmarks and the overview responds to taps", async ({ page }) => {
    await ready(page);
    expect(await page.locator(".flight-label").count()).toBeLessThanOrEqual(2);
    await checkBoxes(page);
    await expect(page.locator('.flight-label[data-group-id="heart-activity"]')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "artifacts/screenshots/flight-quiet-mobile.png", fullPage: true });
    const slider = page.getByRole("slider", { name: /Frequency ruler/ });
    const before = Number((await state(page))[0]); await slider.tap();
    await expect.poll(async () => Number((await state(page))[0])).toBeGreaterThan(before);
    await page.locator(`.flight-overview-shortcuts [data-jump-id="${a4}"]`).tap();
    expect((await state(page))[0]).toBe(String(Math.log10(440)));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
