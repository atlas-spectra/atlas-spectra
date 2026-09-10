import { expect, test } from "@playwright/test";
import type { ExplorerItem, MarkKind } from "../../src/lib/corpus";
import {
  anchorLog, boundedCoordinate, buildFlightModel, cameraDistance,
  layoutFlightLabels, parseCoordinate, projectPoint, recordCoordinate,
} from "../../src/lib/flight";

const lanes = ["Biological", "Optical"];
function item(id: string, kind: MarkKind, low: number, high = low, positionsHz?: number[]): ExplorerItem {
  return {
    id, name: id, lane: "Biological", domains: ["biology"], summary: "Synthetic test fixture",
    profileType: "periodic", axisKind: "temporal_frequency", markKind: kind,
    display: { lowHz: low, highHz: high, positionsHz, nativeLabel: "fixture", mode: kind === "reference" ? "claim-reference" : "native", note: "fixture" },
    sources: [], provenance: [], relationships: [],
  };
}

test.describe("pure Flight projection (no WebGL)", () => {
  test("preserves kinds and logarithmic range/line coordinates", () => {
    const kinds: MarkKind[] = ["point", "band", "lines", "spectrum", "chirp", "reference"];
    const fixtures = kinds.map((kind) => item(kind, kind, 1, kind === "point" ? 1 : 100, kind === "lines" ? [1, 100] : undefined));
    const model = buildFlightModel(fixtures, lanes);
    expect(model.records).toHaveLength(kinds.length);
    for (const record of model.records) {
      expect(record.kind).toBe(record.id);
      expect(record.low).toBe(0);
      expect(record.high).toBe(record.kind === "point" ? 0 : 2);
    }
    expect(model.records.find((r) => r.kind === "lines")!.lines).toEqual([0, 2]);
    expect(model.records.find((r) => r.kind === "reference")!.kind).toBe("reference");
    expect(model).toEqual(buildFlightModel([...fixtures].reverse(), lanes));
  });

  test("does not invent coordinates for invalid, unresolved, or absent-line records", () => {
    const unresolved = { ...item("unknown", "point", 1), display: null };
    const model = buildFlightModel([
      unresolved, item("zero", "point", 0), item("nan", "point", NaN),
      item("infinite", "point", Infinity), item("reversed", "band", 100, 1), item("no-lines", "lines", 1, 100),
    ], lanes);
    expect(model.records).toHaveLength(0);
    expect(model.unpositionedIds).toHaveLength(6);
    expect(model.bounds).toEqual({ min: -1, max: 1 });
  });

  test("uses actual lines, not a midpoint in the spectral gap", () => {
    const model = buildFlightModel([item("line-fixture", "lines", 1, 10000, [1, 10000])], lanes);
    const record = model.records[0];
    expect(record.lines).toContain(anchorLog(record, 2));
    expect(record.lines).toContain(recordCoordinate(record));
    expect(anchorLog(record, 3)).toBe(4);
  });

  test("handles missing, malformed, and extreme URL coordinates", () => {
    const model = buildFlightModel([item("fixture", "band", 1, 100)], lanes);
    for (const raw of [null, "", " ", "NaN", "Infinity", "not-a-frequency"]) {
      expect(parseCoordinate(raw, model)).toBe(model.start);
    }
    expect(parseCoordinate("1e300", model)).toBe(model.bounds.max);
    expect(parseCoordinate("-1e300", model)).toBe(model.bounds.min);
    expect(parseCoordinate("1.25", model)).toBe(1.25);
    expect(boundedCoordinate(NaN, model.bounds)).toBe(model.bounds.min);
  });

  test("keeps selected labels contained at desktop and touch widths", () => {
    const model = buildFlightModel([item("a", "point", 1), item("b", "point", 1), item("c", "band", 1, 10)], lanes);
    for (const width of [296, 360, 900]) {
      const labels = layoutFlightLabels(model, 0, width, 490, "b");
      expect(labels.length).toBeGreaterThan(0);
      expect(labels[0].record.id).toBe("b");
      for (const label of labels) {
        expect(label.left).toBeGreaterThanOrEqual(0);
        expect(label.left + label.width).toBeLessThanOrEqual(width);
        expect(label.top).toBeGreaterThanOrEqual(0);
        expect(label.top + 64).toBeLessThanOrEqual(490);
      }
    }
  });

  test("perspective math is finite and rejects points behind the camera", () => {
    expect(cameraDistance(0.6)).toBeGreaterThan(cameraDistance(1.5));
    expect(projectPoint(0, 0, 0, 0, 900, 600)).toEqual({ x: 450, y: 300 });
    expect(projectPoint(0, 0, 0, 3, 900, 600)).toBeNull();
    expect(projectPoint(0, 0, 0, 0, 0, 0)).toBeNull();
  });
});
