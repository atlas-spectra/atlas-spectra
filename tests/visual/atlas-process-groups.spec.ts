import { expect, test, type Page } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";
import { PROCESS_GROUPS, facetEvidence, groupForRecord, projectDiscovery, validateProcessGroups } from "../../src/lib/process-groups";
import { atlasBounds, extentOf } from "../../src/lib/atlas-view";

const group = PROCESS_GROUPS[0], heart = group.anchorId;
const electrical = group.facets[1].recordId, arterial = group.facets[2].recordId;
const route = "/atlas-spectra/explore/";
const focused = `${route}?lane=Biological&center=0.111&span=1.2`;
const shell = (page: Page) => page.locator(".atlas-workspace");
const camera = (page: Page) => shell(page).evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan, el.dataset.boundMin, el.dataset.boundMax]);
const card = (page: Page) => page.locator('.plot-label[data-group-id="heart-activity"]');
const panel = (page: Page) => page.getByRole("region", { name: "Heart activity observations", exact: true });
async function ready(page: Page, url = focused) {
  await page.goto(url); await expect(shell(page)).toHaveAttribute("data-ready", "true");
}
function fixture(id: string, value = 1): ExplorerItem {
  return { id, name: id, summary: "Fixture", lane: "Biological", domains: ["biology"],
    profileType: "event_rate", axisKind: "event_rate", markKind: "band",
    display: { lowHz: value, highHz: value * 1.5, mode: "normalized", nativeLabel: "fixture rate", note: "Fixture" }, sources: [], provenance: [], relationships: [] };
}

test("process membership is explicit, not a numerical coincidence or merged quantity", () => {
  const items = group.facets.map((facet, index) => fixture(facet.recordId, index ? 400 : 1));
  const clock = fixture("timekeeping.quartz-wristwatch.one-second-tick"); items.push(clock);
  const snapshot = JSON.stringify(items), before = atlasBounds(items);
  const result = projectDiscovery(items);
  expect(result.items.map((item) => item.id)).toEqual([heart, clock.id]);
  expect(result.items[0]).toBe(items[0]);
  expect(extentOf(result.items[0])).toEqual(extentOf(items[0]));
  expect(groupForRecord(clock.id)).toBeUndefined();
  expect(projectDiscovery(items, electrical).items).toEqual(items);
  expect(projectDiscovery(items, null, true).items).toEqual(items);
  expect(atlasBounds(items)).toEqual(before); expect(JSON.stringify(items)).toEqual(snapshot);
});

test("partial filters and missing or invalid anchors do not erase observations", () => {
  const items = group.facets.map((facet) => fixture(facet.recordId));
  const partial = items.slice(1);
  expect(projectDiscovery(partial).items).toEqual(partial);
  const noAnchor = items.map((item) => item.id === heart ? { ...item, display: null } : item);
  expect(projectDiscovery(noAnchor).items).toEqual(noAnchor);
  const invalid = items.map((item) => item.id === heart ? { ...item, display: { ...item.display!, lowHz: NaN } } : item);
  expect(projectDiscovery(invalid).collapsed.size).toBe(0);
  expect(() => validateProcessGroups(items)).not.toThrow();
  expect(() => validateProcessGroups(partial)).toThrow(/Unknown process member/);
});

test("facet evidence uses its own quantitative field rather than a sibling badge", () => {
  const item = fixture(electrical);
  item.provenance = [
    { target: "/claims/0", evidence: { basis: "established_reference" } },
    { target: "/frequency_profile", evidence: { basis: "model_derived" } },
    { target: "/frequency_profile/rate", evidence: { basis: "computed_derivation" } },
  ];
  expect(facetEvidence(item, "/frequency_profile/rate")?.basis).toBe("computed_derivation");
  item.provenance.pop(); expect(facetEvidence(item, "/frequency_profile/rate")?.basis).toBe("model_derived");
  item.provenance.pop(); expect(facetEvidence(item, "/frequency_profile/rate")).toBeUndefined();
});

test("Discover starts with one heart entry, not three independent phenomena", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  await expect(shell(page)).toHaveAttribute("data-detail-mode", "discover");
  await expect(page.locator(".plot-label")).toHaveCount(1);
  await expect(card(page)).toContainText("Heart activity");
  await expect(card(page)).toContainText("Heartbeat reference");
  await expect(card(page)).toContainText("60–100 bpm");
  await expect(card(page)).toContainText("Explore 3 observations");
  await expect(panel(page)).toHaveCount(0);
  await page.locator(".canvas-frame").screenshot({ path: "artifacts/screenshots/atlas-process-collapsed.png" });
  await ready(page, route); await expect(page.locator(".plot-label")).toHaveCount(12);
  await expect(page.locator('.plot-label[data-record-id="timekeeping.quartz-wristwatch.one-second-tick"]')).toHaveCount(1);
  await expect(page.locator(`.plot-label[data-record-id="${arterial}"]`)).toHaveCount(0);
  await page.screenshot({ path: "artifacts/screenshots/atlas-discovery-overview.png", fullPage: true });
});

test("expansion preserves the camera and each observation's evidence and selection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  const before = await camera(page); await card(page).focus(); await card(page).press("Enter");
  await expect(panel(page)).toBeVisible(); await expect(page.locator(".plot-label")).toHaveCount(3);
  expect(await camera(page)).toEqual(before);
  await expect(panel(page).locator('[data-basis="established_reference"]')).toHaveCount(1);
  await expect(panel(page).locator('[data-basis="model_derived"]')).toHaveCount(2);
  await panel(page).getByText("Why do these have the same numbers?", { exact: true }).click();
  await expect(panel(page)).toContainText("not three independent measurements");
  for (const facet of group.facets) {
    const button = panel(page).locator(`[data-facet-id="${facet.recordId}"]`);
    await button.click(); await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", facet.recordId);
    await expect(page.locator(".detail-link")).toHaveAttribute("href", new RegExp(`/phenomena/${facet.recordId}/$`));
    expect(await camera(page)).toEqual(before);
  }
  await panel(page).screenshot({ path: "artifacts/screenshots/atlas-process-expanded.png" });
  await panel(page).getByRole("button", { name: "Collapse observations" }).click();
  await expect(panel(page)).toHaveCount(0); await expect(card(page)).toBeFocused();
  await expect(shell(page)).toHaveAttribute("data-lane", "Biological");
  await expect(page.locator(".plot-label")).toHaveCount(1); expect(await camera(page)).toEqual(before);
});

test("All observations is an explicit reversible comparison mode and reloads exactly", async ({ page }) => {
  await ready(page, route); const before = await camera(page);
  await page.getByRole("button", { name: "All observations", exact: true }).click();
  await expect(page.locator(".plot-label")).toHaveCount(14); expect(await camera(page)).toEqual(before);
  await expect.poll(() => new URL(page.url()).searchParams.get("detail")).toBe("observations");
  await page.reload(); await expect(shell(page)).toHaveAttribute("data-detail-mode", "observations");
  await expect(page.locator(".plot-label")).toHaveCount(14); expect(await camera(page)).toEqual(before);
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.locator(".plot-label")).toHaveCount(12); expect(await camera(page)).toEqual(before);
  await ready(page, `${focused}&detail=garbage`); await expect(page.locator(".plot-label")).toHaveCount(1);
});

test("canonical facet deep links reveal the right group and preserve exact viewport on reload", async ({ page }) => {
  await ready(page, `${focused}&entity=${electrical}`);
  await expect(panel(page)).toBeVisible(); await expect(page.locator(".plot-label")).toHaveCount(3);
  await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", electrical);
  const before = await camera(page);
  await page.reload(); await expect(shell(page)).toHaveAttribute("data-ready", "true");
  await expect(panel(page)).toBeVisible(); expect(await camera(page)).toEqual(before);
  const href = await page.locator(".atlas-mode a").getAttribute("href");
  expect(href).toContain(`entity=${encodeURIComponent(electrical)}`);
});

test("search finds a hidden facet and partial filters never substitute a different record", async ({ page }) => {
  await ready(page);
  await page.getByLabel("Find a phenomenon", { exact: true }).fill("ECG");
  const results = page.getByRole("region", { name: "Search results" });
  await expect(results).toContainText("Observation of Heart activity");
  await expect(page.locator(".plot-label")).toHaveCount(1);
  await expect(page.locator(`.plot-label[data-record-id="${electrical}"]`)).toHaveCount(1);
  await results.getByRole("button").click();
  await expect(panel(page)).toBeVisible(); await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", electrical);
});

test("neighborhood and catalog do not repeat a closed process and tracing never invents parent edges", async ({ page }) => {
  await ready(page);
  await expect(page.locator('.atlas-neighbor-list [data-group-id="heart-activity"]')).toHaveCount(1);
  await expect(page.locator(`.atlas-neighbor-list [data-neighbor-id="${arterial}"]`)).toHaveCount(0);
  const before = await camera(page);
  await page.getByRole("button", { name: "Browse all records", exact: true }).click();
  await expect(shell(page)).toHaveAttribute("data-lane", "all");
  await expect(page.locator(".atlas-record-list>button")).toHaveCount(20);
  await expect(page.locator('.atlas-record-list [data-process-id="heart-activity"]')).toHaveCount(1);
  expect(await camera(page)).toEqual(before);
  // Reapply the domain to test that tracing does not bypass it until explicitly framed.
  await page.getByRole("group", { name: "Domain focus" }).getByRole("button", { name: "Biological", exact: true }).click();
  await card(page).click();
  await page.getByRole("button", { name: "Trace recorded connections", exact: true }).click();
  await expect(shell(page)).toHaveAttribute("data-detail-mode", "observations");
  await expect(page.locator('.atlas-recorded-links [data-relationship-id="relationship.heart-lower-bound-to-quartz-one-hz"]')).toHaveCount(0);
  // The clock is outside the Biological filter until Frame connections is requested.
  await page.getByRole("button", { name: "Frame connections", exact: true }).click();
  await expect(shell(page)).toHaveAttribute("data-moving", "false");
  await expect(page.locator('.atlas-recorded-links [data-category="numerical"]')).toHaveCount(1);
  await expect(page.locator(".atlas-connection.is-numerical")).toContainText("mechanism: none");
});

test.describe("touch process discovery", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("a touch user can recognize, expand and inspect a process without hover", async ({ page }) => {
    await ready(page);
    await expect(card(page).locator(".process-disclosure")).toBeVisible();
    const clipped = await card(page).locator(".phenomenon-copy").evaluate((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    expect(clipped).toBe(false);
    await page.locator(".canvas-frame").screenshot({ path: "artifacts/screenshots/atlas-process-mobile-collapsed.png" });
    await card(page).tap(); await expect(panel(page)).toBeVisible();
    await panel(page).locator(`[data-facet-id="${electrical}"]`).tap();
    await expect(page.locator(".atlas-inspector")).toHaveAttribute("data-selected-id", electrical);
    const boxes = await panel(page).locator(".process-facets>button").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; }));
    for (const box of boxes) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(390); expect(box.width).toBeGreaterThan(100); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await panel(page).screenshot({ path: "artifacts/screenshots/atlas-process-mobile-expanded.png" });
  });
});
