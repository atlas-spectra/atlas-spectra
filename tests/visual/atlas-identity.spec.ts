import { expect, test, type Page } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";
import { CARDIAC_OBSERVATION_IDS, PHENOMENON_IDENTITIES, identityFor } from "../../src/lib/phenomenon-identity";
import { ATLAS_LABEL_HEIGHT, atlasBounds, extentOf, fitItems, layoutAtlas, matchesAtlas } from "../../src/lib/atlas-view";

const route = "/atlas-spectra/explore/";
const cases = [
  { id: CARDIAC_OBSERVATION_IDS[0], title: "Heartbeat", subtitle: "Beats counted", symbol: "heart" },
  { id: CARDIAC_OBSERVATION_IDS[1], title: "Arterial pulse", subtitle: "Pressure pulses arriving", symbol: "artery" },
  { id: CARDIAC_OBSERVATION_IDS[2], title: "Heart electricity", subtitle: "Ventricular activations", symbol: "electrodes" },
];
const shell = (page: Page) => page.locator(".atlas-workspace");
const state = (page: Page) => shell(page).evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan]);
function fixture(id: string): ExplorerItem {
  return { id, name: `Canonical ${id}`, summary: "Original summary", lane: "Biological", domains: ["biology"],
    profileType: "event_rate", axisKind: "event_rate", markKind: "band",
    display: { lowHz: 1, highHz: 100 / 60, mode: "normalized", nativeLabel: "60–100 bpm", note: "Event rate, not a sinusoid" },
    sources: [], relationships: [], provenance: [] };
}
async function biological(page: Page) {
  // Identity-level comparisons belong to the explicit All observations view.
  await page.goto(`${route}?lane=Biological&center=0.111&span=1.2&detail=observations`);
  await expect(shell(page)).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".plot-label")).toHaveCount(3);
}

test("editorial identities resolve canonical records and contain no scientific values", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto(route);
    const links = page.locator("noscript a");
    await expect(links.first()).toBeVisible();
    const ids = new Set<string>();
    for (const link of await links.all()) {
      const href = await link.getAttribute("href");
      const match = href?.match(/\/phenomena\/([^/]+)\/$/);
      if (!match) throw new Error(`Expected a canonical phenomenon link, got ${href}`);
      ids.add(decodeURIComponent(match[1]));
    }
    for (const [id, identity] of Object.entries(PHENOMENON_IDENTITIES)) {
      expect(ids.has(id), id).toBe(true);
      expect(Object.keys(identity).every((key) => ["title", "subtitle", "symbol", "aliases"].includes(key))).toBe(true);
      expect(identity.title.length).toBeGreaterThan(0);
      expect(identity.subtitle.length).toBeGreaterThan(0);
    }
    expect(new Set(cases.map(({ id }) => identityFor(fixture(id)).symbol)).size).toBe(3);
  } finally { await context.close(); }
});

test("identity does not alter equal coordinates, event semantics or label packing", () => {
  const items = cases.map(({ id }) => fixture(id)), snapshot = JSON.stringify(items);
  const bounds = atlasBounds(items), view = fitItems(items, bounds)!;
  for (const width of [340, 700, 1020]) {
    const layout = layoutAtlas(items, ["Biological"], view, width);
    expect(layout.marks).toHaveLength(3);
    expect(new Set(layout.marks.map((mark) => mark.x)).size).toBe(1);
    for (const [index, mark] of layout.marks.entries()) {
      expect(mark.extent).toEqual(extentOf(items[0]));
      expect(mark.item.profileType).toBe("event_rate");
      expect(mark.y).toBeGreaterThan(mark.labelTop + ATLAS_LABEL_HEIGHT);
      for (const other of layout.marks.slice(index + 1)) expect(Math.abs(mark.labelTop - other.labelTop)).toBeGreaterThan(ATLAS_LABEL_HEIGHT);
    }
  }
  expect(JSON.stringify(items)).toBe(snapshot);
});

test("aliases complement canonical metadata and unknown records stay neutral", () => {
  expect(matchesAtlas(fixture(CARDIAC_OBSERVATION_IDS[2]), "  ECG  ", null)).toBe(true);
  expect(matchesAtlas(fixture(CARDIAC_OBSERVATION_IDS[2]), "ECG", "Optical")).toBe(false);
  const unknown = { ...fixture("future.record"), display: null };
  expect(identityFor(unknown)).toEqual({ title: unknown.name, subtitle: unknown.lane, symbol: "record" });
  expect(extentOf(unknown)).toBeNull();
  expect(identityFor(fixture("__proto__")).symbol).toBe("record");
});

test("three cardiac observations are identified without hover or selection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await biological(page);
  await expect(page.getByRole("note", { name: "Different observations of heart activity" })).toContainText("count different events");
  await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", "");
  const shapes: string[] = [];
  for (const entry of cases) {
    const card = page.locator(`.plot-label[data-record-id="${entry.id}"]`);
    await expect(card.locator(".phenomenon-title")).toHaveText(entry.title);
    await expect(card.locator(".phenomenon-subtitle")).toHaveText(entry.subtitle);
    await expect(card.locator(".phenomenon-value")).toContainText("60–100 bpm");
    await expect(card.locator(".phenomenon-qualifier")).toHaveText("Event rate");
    await expect(card.locator(".phenomenon-symbol")).toHaveAttribute("data-symbol", entry.symbol);
    const icon = await card.locator(".phenomenon-symbol").boundingBox();
    expect(icon!.width).toBeGreaterThanOrEqual(34);
    shapes.push(await card.locator("svg").innerHTML());
  }
  expect(new Set(shapes).size).toBe(3);
  await page.locator(".canvas-frame").screenshot({ path: "artifacts/screenshots/atlas-heart-observations.png" });
  await page.screenshot({ path: "artifacts/screenshots/atlas-identity-desktop.png", fullPage: true });
});

test("each visible identity selects its own unchanged record with keyboard access", async ({ page }) => {
  await biological(page);
  const before = await state(page);
  for (const entry of cases) {
    const card = page.locator(`.plot-label[data-record-id="${entry.id}"]`);
    await card.focus(); await card.press("Enter");
    await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", entry.id);
    await expect(page.locator(".atlas-identity-heading h2")).toHaveText(entry.title);
    await expect(page.locator(".atlas-canonical-name")).toContainText("Full record:");
    await expect(page.locator(".detail-metadata")).toContainText("event rate");
    expect(await state(page)).toEqual(before);
  }
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("ECG");
  await expect(page.getByRole("region", { name: "Search results" }).locator(".phenomenon-title")).toHaveText("Heart electricity");
});

test("mobile cardiac names and distinguishing subtitles stay readable and contained", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await biological(page);
  for (const entry of cases) {
    const card = page.locator(`.plot-label[data-record-id="${entry.id}"]`);
    const box = await card.boundingBox();
    for (const selector of [".phenomenon-title", ".phenomenon-subtitle", ".phenomenon-symbol"]) {
      const element = card.locator(selector), inside = await element.boundingBox();
      expect(inside!.x).toBeGreaterThanOrEqual(box!.x);
      expect(inside!.x + inside!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
      expect(inside!.y + inside!.height).toBeLessThanOrEqual(box!.y + box!.height + 1);
    }
    const clipped = await card.locator(".phenomenon-subtitle").evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(clipped, entry.subtitle).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".canvas-frame").screenshot({ path: "artifacts/screenshots/atlas-heart-observations-mobile.png" });
});

test("acoustic sound and perceived pitch retain different identities and reference semantics", async ({ page }) => {
  await page.goto(`${route}?center=${Math.log10(440)}&span=1.2`);
  await expect(shell(page)).toHaveAttribute("data-ready", "true");
  const tone = page.locator('.plot-label[data-record-id="acoustics.standard-pitch.a4-440hz"]');
  const perception = page.locator('.plot-label[data-record-id="perception.pitch.a4-reference"]');
  await expect(tone.locator(".phenomenon-title")).toHaveText("A4 sound");
  await expect(tone.locator(".phenomenon-symbol")).toHaveAttribute("data-symbol", "fork");
  await expect(perception.locator(".phenomenon-title")).toHaveText("A4 as heard");
  await expect(perception.locator(".phenomenon-symbol")).toHaveAttribute("data-symbol", "ear");
  await expect(perception).toHaveClass(/is-reference/);
  await expect(perception.locator(".phenomenon-qualifier")).toHaveText("Reference");
  await perception.click();
  await expect(page.getByRole("region", { name: "Reference coordinate evidence" })).toContainText("established reference · reviewed");
  await page.locator(".canvas-frame").screenshot({ path: "artifacts/screenshots/atlas-sound-and-perception.png" });
});
