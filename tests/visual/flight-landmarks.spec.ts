import { expect, test } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";
import {
  adjacentLandmarks, buildFlightModel, landmarkCoordinates,
  layoutFlightLabels, parseCoordinate, recordCoordinate,
} from "../../src/lib/flight";

function lineItem(positions: number[]): ExplorerItem {
  return {
    id: "test.multiline", name: "Synthetic line fixture", summary: "Test-only data",
    domains: ["testing"], lane: "Biological", profileType: "discrete_lines",
    axisKind: "temporal_frequency", markKind: "lines",
    display: { lowHz: 1, highHz: 1e8, positionsHz: positions, mode: "native", nativeLabel: "fixture", note: "fixture" },
    sources: [], provenance: [], relationships: [],
  };
}
const lanes = ["Biological", "Optical"];

test("line selection and label anchors use the nearest actual line", () => {
  const model = buildFlightModel([lineItem([1, 1e4, 1e8])], lanes);
  const record = model.records[0];
  expect(recordCoordinate(record, 3.9)).toBe(4);
  expect(recordCoordinate(record, 7.9)).toBe(8);
  expect(recordCoordinate(record, -0.1)).toBe(0);
  expect(recordCoordinate(record, NaN)).toBe(0);
  const label = layoutFlightLabels(model, 3.9, 900, 570, record.id)[0];
  expect(label).toBeDefined();
  expect(label.coordinate).toBe(4);
  expect(recordCoordinate(record, label.coordinate)).toBe(label.coordinate);
});

test("all actual lines are sorted unique landmarks, not spectral-gap midpoints", () => {
  const model = buildFlightModel([lineItem([1e8, 1, 1e4, 1e4, NaN, -1, Infinity])], lanes);
  expect(landmarkCoordinates(model)).toEqual([0, 4, 8]);
  expect(adjacentLandmarks(landmarkCoordinates(model), 4)).toEqual({ previous: 0, next: 8 });
  expect(adjacentLandmarks(landmarkCoordinates(model), 0).previous).toBeUndefined();
  expect(adjacentLandmarks(landmarkCoordinates(model), 8).next).toBeUndefined();
});

test("close lines remain reachable in both directions after exact URL round trips", () => {
  const model = buildFlightModel([lineItem([1, 1e4, 10001, 1e8])], lanes);
  const stops = landmarkCoordinates(model);
  const closeLine = Math.log10(10001);
  expect(stops).toEqual([0, 4, closeLine, 8]);
  expect(adjacentLandmarks(stops, 4).next).toBe(closeLine);
  expect(adjacentLandmarks(stops, closeLine)).toEqual({ previous: 4, next: 8 });
  for (const stop of stops) {
    const url = new URL("https://example.test/flight/");
    url.searchParams.set("at", String(stop));
    const restored = parseCoordinate(url.searchParams.get("at"), model);
    expect(restored).toBe(stop);
    expect(adjacentLandmarks(stops, restored)).toEqual(adjacentLandmarks(stops, stop));
  }
});

test("non-line ranges keep midpoint navigation and unresolved records add no stops", () => {
  const band: ExplorerItem = { ...lineItem([]), id: "test.band", markKind: "band",
    display: { lowHz: 1, highHz: 100, mode: "native", nativeLabel: "fixture", note: "fixture" } };
  const unresolved = { ...band, id: "test.unresolved", display: null };
  const model = buildFlightModel([band, unresolved], lanes);
  expect(recordCoordinate(model.records[0], 0)).toBe(1);
  expect(recordCoordinate(model.records[0], 2)).toBe(1);
  expect(landmarkCoordinates(model)).toEqual([1]);
  expect(model.unpositionedIds).toEqual(["test.unresolved"]);
});
