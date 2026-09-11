import { expect, test } from "@playwright/test";
import { flightDepthWindow, flightRecordLocation, planFlightLabels, type FlightModel, type FlightRecord } from "../../src/lib/flight";

const record: FlightRecord = { id: "fixture.lines", name: "Spectral fixture", lane: "Molecular", kind: "lines", low: 0, high: 4, lines: [0, 4], x: -3.3, y: 0 };
const model: FlightModel = { records: [record], bounds: { min: -0.5, max: 12.5 }, start: 0, unpositionedIds: [] };

test("a nearer line behind the camera cannot hide a visible later line", () => {
  const at = 1.5;
  const plan = planFlightLabels(model, at, 900, 570, record.id);
  expect(plan.labels).toHaveLength(1);
  expect(plan.labels[0].coordinate).toBe(4);
  expect(plan.eligibleCount).toBe(1);
  const window = flightDepthWindow(model, at, 900, 570);
  expect(flightRecordLocation(record, at, window, new Set())).toBe("In depth window · not labeled");
});

test("a spectral envelope around an empty depth interval does not count as local data", () => {
  const sparse = { ...record, high: 12, lines: [0, 12] };
  const m = { ...model, records: [sparse] }, at = 6;
  const window = flightDepthWindow(m, at, 900, 570);
  expect(planFlightLabels(m, at, 900, 570, sparse.id).labels).toEqual([]);
  expect(flightRecordLocation(sparse, at, window, new Set())).toBe("Between spectral lines · not labeled");
});
