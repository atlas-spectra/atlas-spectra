import { expect, test, type Page } from "@playwright/test";
const route = "/atlas-spectra/journeys/";
const shell = (page: Page) => page.locator(".journey-app");
const cardiac = ["cardiology.ventricular-activation.resting-adult", "cardiology.arterial-pulse.resting-adult", "wearable.ppg.resting-adult-optical-variation", "wearable.ppg.resting-adult-pulse"];
const hair = "hearing.cochlea.hair-cell-electrical-signal";
async function ready(page: Page, search = "") { await page.goto(`${route}${search}`); await expect(shell(page)).toHaveAttribute("data-ready", "true"); }
async function capture(page: Page, name: string) {
  // Keep the real sticky header at the page top instead of overlaying the selected
  // stage in a full-page/element capture after an auto-scrolled interaction.
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: `artifacts/screenshots/${name}.png`, fullPage: true });
}

test("a journey shows connected stages with bounded, user-directed navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); await ready(page);
  await expect(page.locator(".journey-step")).toHaveCount(4);
  await expect(page.locator(".journey-hop-label")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Previous stage", exact: false })).toBeDisabled();
  await expect(page.locator(".journey-step[aria-current=step]")).toHaveAttribute("data-stage-id", cardiac[0]);
  await expect(page.locator(".journey-stage-detail")).toContainText("Ventricular electrical activation count");
  await capture(page, "journey-heart-overview");
  for (const id of cardiac.slice(1)) {
    await page.getByRole("button", { name: "Next stage", exact: false }).click();
    await expect(shell(page)).toHaveAttribute("data-stage", id);
    expect(new URL(page.url()).searchParams.get("stage")).toBe(id);
  }
  await expect(page.getByRole("button", { name: "Next stage", exact: false })).toBeDisabled();
  await expect(page.locator(".journey-connection-detail")).toHaveAttribute("data-edge-id", "relationship.ppg-optical-to-electrical");
  await expect(page.locator(".journey-edge-description")).toContainText("photodetector");
  await expect(page.locator(".journey-edge-evidence")).toContainText("physical");
  await capture(page, "journey-sensor-connection");
});

test("keyboard selection, reload and browser history restore exact stage IDs", async ({ page }) => {
  await ready(page);
  const target = page.locator(`[data-stage-id="${cardiac[2]}"]`);
  await target.focus(); await target.press("Enter"); await expect(target).toBeFocused();
  await expect(page.locator(".journey-status")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator(".journey-status")).toContainText("Stage 3 of 4");
  const url = page.url(); await page.reload(); await expect(shell(page)).toHaveAttribute("data-ready", "true");
  await expect(shell(page)).toHaveAttribute("data-stage", cardiac[2]); expect(page.url()).toBe(url);
  await page.locator('[data-journey-id="quartz-clock"]').click();
  await expect(page.locator(".journey-step")).toHaveCount(2);
  await page.goBack(); await expect(shell(page)).toHaveAttribute("data-stage", cardiac[2]);
  await page.goForward(); await expect(shell(page)).toHaveAttribute("data-journey", "quartz-clock");
});

test("unknown coordinates remain navigable and edge evidence comes from its owner", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); await ready(page, "?journey=sound-to-nerve");
  await expect(page.locator(".journey-edge-sources")).toContainText("How Do We Hear?");
  await expect(page.locator(".journey-edge-sources")).not.toContainText("ISO 16");
  await page.locator(`[data-stage-id="${hair}"]`).click();
  await expect(page.locator(".journey-quantity")).toContainText("No frequency assigned");
  await expect(page.locator(".journey-quantity")).not.toContainText("440");
  const atlas = page.getByRole("link", { name: "Inspect in Atlas", exact: false });
  const href = await atlas.getAttribute("href");
  const params = new URL(href!, "https://example.org").searchParams;
  expect([...params.keys()]).toEqual(["entity"]); expect(params.get("entity")).toBe(hair);
  await page.locator(".journey-edge-origin summary").click();
  await expect(page.locator(".journey-edge-origin")).toContainText("Cochlear hair-cell electrical response");
  await capture(page, "journey-unpositioned");
  await atlas.click(); await expect(page.locator(".atlas-workspace")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", hair);
  await expect(page.locator(`.plot-label[data-record-id="${hair}"]`)).toHaveCount(0);
});

test("observation provenance remains distinct from evidence for its transition", async ({ page }) => {
  await ready(page, `?journey=cardiac-sensing&stage=${cardiac[2]}`);
  await expect(page.locator(".journey-edge-evidence")).toContainText("established reference · reviewed");
  await page.locator(".journey-record-evidence>summary").click();
  await expect(page.locator('.journey-record-evidence [data-evidence-target="/frequency_profile/rate"]')).toContainText("model derived · reviewed");
  await expect(page.locator(".journey-connection-detail")).toHaveAttribute("data-edge-id", "relationship.arterial-pulse-modulates-ppg-optical");
});

test("quartz frequency division uses the recorded values and relationship, not a proximity link", async ({ page }) => {
  await ready(page, "?journey=quartz-clock");
  await expect(page.locator(".journey-native")).toContainText("32768 Hz");
  await expect(page.locator(".journey-edge-description")).toContainText("32,768");
  await expect(page.locator(".journey-connection-detail")).toHaveAttribute("data-edge-id", "relationship.quartz-wristwatch.divided-to-one-hz");
  await page.getByRole("button", { name: "Next stage", exact: false }).click();
  await expect(page.locator(".journey-native")).toContainText("1 Hz");
  await expect(page.locator(".journey-edge-sources")).toContainText("Timekeeping and clocks FAQs");
  await expect(page.locator(".journey-step")).toHaveCount(2);
});

test("Heart activity links into its process and the selected sensor links back to the exact record", async ({ page }) => {
  await page.goto("/atlas-spectra/explore/?lane=Biological&center=0.111&span=1.2");
  await expect(page.locator(".atlas-workspace")).toHaveAttribute("data-ready", "true");
  await page.locator('.plot-label[data-group-id="heart-activity"]').click();
  await page.getByRole("link", { name: "Follow the signal from heart to wearable", exact: false }).click();
  await expect(shell(page)).toHaveAttribute("data-ready", "true");
  await page.locator(`[data-stage-id="${cardiac[3]}"]`).click();
  await page.getByRole("link", { name: "Inspect in Atlas", exact: false }).click();
  await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", cardiac[3]);
});

test("malformed links recover and reduced motion requires no animation or autoplay", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page, "?journey=__proto__&stage=1e300");
  await expect(shell(page)).toHaveAttribute("data-stage", cardiac[0]);
  await page.getByRole("button", { name: "Next stage", exact: false }).click();
  await expect(shell(page)).toHaveAttribute("data-stage", cardiac[1]);
  const state = await shell(page).getAttribute("data-stage");
  await page.waitForTimeout(450); // Detect unrequested stage progression, not a readiness sleep.
  expect(await shell(page).getAttribute("data-stage")).toBe(state);
  expect(errors).toEqual([]);
});

test("no-JavaScript fallback exposes every ordered source record and connection", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage(); await page.goto(route);
    const fallback = page.getByRole("region", { name: "Signal journeys without JavaScript" });
    await expect(fallback).toBeVisible(); await expect(fallback.locator("li")).toHaveCount(9);
    await expect(fallback.getByRole("link", { name: "Connection evidence", exact: true })).toHaveCount(6);
  } finally { await context.close(); }
});

test.describe("touch journeys", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("mobile stages and site navigation are readable, contained and usable without hover", async ({ page }) => {
    await ready(page);
    await page.locator(`[data-stage-id="${cardiac[2]}"]`).tap();
    await expect(shell(page)).toHaveAttribute("data-stage", cardiac[2]);
    for (const button of await page.locator(".journey-step").all()) {
      const box = await button.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390); expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture(page, "journey-mobile");
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Atlas", exact: true }).tap();
    await expect(page.locator(".atlas-workspace")).toHaveAttribute("data-ready", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Journeys", exact: true }).tap();
    await expect(shell(page)).toHaveAttribute("data-ready", "true");
  });
});
