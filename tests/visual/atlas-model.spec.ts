import { expect, test } from "@playwright/test";
import type { ExplorerItem, MarkKind } from "../../src/lib/corpus";
import { atlasBounds, boundView, extentOf, fitAll, fitItems, geometryFor, hitAtlas, layoutAtlas, matchesAtlas, readAtlasState, zoomView } from "../../src/lib/atlas-view";
const lanes = ["Biological", "Optical", "Other"];
function item(id: string, kind: MarkKind = "point", low = 1, high = low, lines?: number[]): ExplorerItem {
  return { id, name: id, summary: "Fixture", domains: ["hemodynamics"], lane: "Biological", profileType: "periodic", axisKind: "temporal_frequency", markKind: kind,
    display: { lowHz: low, highHz: high, positionsHz: lines, mode: "native", note: "Fixture", nativeLabel: "Fixture" }, sources: [], provenance: [], relationships: [] };
}
test("atlas bounds reject invalid coordinates and use actual spectral lines", () => {
  const invalid = [item("zero", "point", 0), item("nan", "point", NaN), item("reverse", "band", 10, 1), item("no-lines", "lines"), { ...item("unknown"), display: null }];
  expect(invalid.map(extentOf)).toEqual([null, null, null, null, null]);
  expect(atlasBounds(invalid)).toEqual({ min: -1, max: 1 });
  const spectral = item("lines", "lines", 1, 1e12, [100, 10000, 100, 0, Infinity]);
  expect(extentOf(spectral)).toEqual({ low: 2, high: 4, lines: [2, 4] });
  expect(atlasBounds([spectral])).toEqual({ min: 1.35, max: 4.65 });
});
test("all navigation paths stay finite and anchored at zoom limits", () => {
  const bounds = atlasBounds([item("low"), item("high", "point", 1e15)]);
  const all = fitAll(bounds);
  expect(boundView({ center: Infinity, span: NaN }, bounds)).toEqual(all);
  expect(boundView({ center: -1e300, span: 4 }, bounds).center).toBe(bounds.min + 2);
  const smallest = boundView({ center: 4, span: 0.0001 }, bounds);
  expect(zoomView(smallest, 0.1, 0.9, bounds)).toEqual(smallest);
  expect(zoomView(all, 2, 0.9, bounds)).toEqual(all);
  expect(fitItems([{ ...item("unknown"), display: null }], bounds)).toBeNull();
  expect(fitItems([item("a4", "point", 440)], bounds)!.center).toBe(Math.log10(440));
});
test("coincident labels occupy non-overlapping rows within the plot at every width", () => {
  const items = [item("a"), item("b"), item("c", "band", 1, 1.66), { ...item("light", "spectrum", 1e14, 1e15), lane: "Optical" }];
  const view = fitAll(atlasBounds(items));
  for (const width of [296, 390, 900]) {
    const result = layoutAtlas(items, lanes, view, width), g = geometryFor(width, view);
    expect(result.marks).toHaveLength(4);
    expect(result.lanes.map((l) => l.name)).toEqual(["Biological", "Optical"]);
    for (const [i, mark] of result.marks.entries()) {
      expect(mark.labelLeft).toBeGreaterThanOrEqual(g.left);
      expect(mark.labelLeft + mark.labelWidth).toBeLessThanOrEqual(g.right);
      for (const other of result.marks.slice(i + 1)) {
        const overlap = mark.labelLeft < other.labelLeft + other.labelWidth && mark.labelLeft + mark.labelWidth > other.labelLeft && mark.labelTop < other.labelTop + 44 && mark.labelTop + 44 > other.labelTop;
        expect(overlap).toBe(false);
      }
    }
  }
});
test("discrete gaps contain neither phantom labels nor broad hit targets", () => {
  const spectral = item("spectrum", "lines", 1, 1e4, [1, 1e4]);
  expect(layoutAtlas([spectral], lanes, { center: 2, span: 1.2 }, 900).marks).toHaveLength(0);
  const [mark] = layoutAtlas([spectral], lanes, fitAll(atlasBounds([spectral])), 900).marks;
  expect([0, 4]).toContain(mark.anchor);
  expect(hitAtlas(mark, mark.xs[0], mark.y)).toBe(true);
  expect(hitAtlas(mark, (mark.xs[0] + mark.xs[1]) / 2, mark.y)).toBe(false);
});
test("URL state preserves exact values and validates domains and entities", () => {
  const items = [item("a4", "point", 440)], bounds = atlasBounds(items), center = Math.log10(440);
  expect(readAtlasState(`?center=${center}&span=1.2&entity=a4&lane=Biological`, bounds, items, lanes)).toEqual({ view: { center, span: 1.2 }, selectedId: "a4", lane: "Biological" });
  const result = readAtlasState("?center=bad&span=&entity=unknown&lane=missing", bounds, items, lanes);
  expect(result).toEqual({ view: fitAll(bounds), selectedId: null, lane: null });
});
test("search combines case-insensitive domain metadata with lane focus", () => {
  expect(matchesAtlas(item("pulse"), " HEMODYNAMICS ", "Biological")).toBe(true);
  expect(matchesAtlas(item("pulse"), "hemodynamics", "Optical")).toBe(false);
});
