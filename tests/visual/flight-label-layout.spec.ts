import { expect, test } from "@playwright/test";
import {
  FLIGHT_LABEL_BOTTOM, FLIGHT_LABEL_CANDIDATES, FLIGHT_LABEL_HEIGHT, FLIGHT_LABEL_TOP,
  flightDepthWindow, flightRecordLocation, planFlightLabels, projectPoint,
  type FlightModel, type FlightRecord,
} from "../../src/lib/flight";

function record(id: string, log = 0): FlightRecord {
  return { id, name: id, lane: "Biological", kind: "point", low: log, high: log, lines: [], x: -3.3, y: 0 };
}
const model = (records: FlightRecord[]): FlightModel => ({ records, bounds: { min: -1, max: 16 }, start: 0, unpositionedIds: [] });

test("dense anchors get alternate label placements without changing their coordinates", () => {
  const records = Array.from({ length: 20 }, (_, i) => record(`record-${String(i).padStart(3, "0")}`));
  const original = JSON.stringify(records);
  for (const width of [296, 366, 900]) {
    const plan = planFlightLabels(model(records), 0, width, 490, records[19].id);
    expect(plan.labels.length).toBeGreaterThanOrEqual(3);
    expect(plan.labels.length).toBeLessThanOrEqual(width < 600 ? 4 : 7);
    expect(plan.eligibleCount).toBe(20);
    expect(plan.labels[0].record.id).toBe(records[19].id);
    expect(plan.labels).toEqual(planFlightLabels(model([...records].reverse()), 0, width, 490, records[19].id).labels);
    for (const [i, label] of plan.labels.entries()) {
      expect(label.record).toBe(records.find((r) => r.id === label.record.id));
      expect(label.coordinate).toBe(0);
      expect({ x: label.anchorX, y: label.anchorY }).toEqual(projectPoint(label.record.x, label.record.y, 0, 0, width, 490));
      expect(label.height).toBe(FLIGHT_LABEL_HEIGHT);
      expect(label.top).toBeGreaterThanOrEqual(FLIGHT_LABEL_TOP);
      expect(label.top + label.height).toBeLessThanOrEqual(490 - FLIGHT_LABEL_BOTTOM);
      expect(label.left).toBeGreaterThanOrEqual(10);
      expect(label.left + label.width).toBeLessThanOrEqual(width - 10);
      for (const other of plan.labels.slice(i + 1)) {
        const overlap = label.left < other.left + other.width + 7 && label.left + label.width + 7 > other.left
          && label.top < other.top + other.height + 7 && label.top + label.height + 7 > other.top;
        expect(overlap).toBe(false);
      }
    }
  }
  expect(JSON.stringify(records)).toBe(original);
});

test("selection wins even when its ID is beyond the bounded candidate pool", () => {
  const records = Array.from({ length: 10000 }, (_, i) => record(`r-${String(i).padStart(5, "0")}`));
  const plan = planFlightLabels(model(records), 0, 900, 570, records[9999].id);
  expect(plan.eligibleCount).toBe(10000);
  expect(plan.candidateCount).toBe(FLIGHT_LABEL_CANDIDATES);
  expect(plan.labels[0].record.id).toBe(records[9999].id);
  expect(plan.labels.length).toBeLessThanOrEqual(7);
});

test("later spectral-line anchors and reference semantics remain literal", () => {
  const line = { ...record("lines"), kind: "lines" as const, low: 0, high: 4, lines: [0, 4] };
  const reference = { ...record("reference", 4), kind: "reference" as const };
  const plan = planFlightLabels(model([line, reference]), 4, 900, 570, "lines");
  expect(plan.labels[0].coordinate).toBe(4);
  expect(plan.labels[0].record.lines).toContain(plan.labels[0].coordinate);
  expect(plan.labels.find((l) => l.record.id === "reference")!.record.kind).toBe("reference");
});

test("off-camera selection and invalid geometry cannot produce fictitious labels", () => {
  const m = model([record("behind", -1), record("ahead", 12), { ...record("invalid"), x: NaN }]);
  expect(planFlightLabels(m, 4, 900, 570, "behind").labels).toEqual([]);
  for (const [w, h] of [[0, 570], [900, 0], [NaN, 570], [900, Infinity], [100, 80]]) {
    expect(planFlightLabels(m, 0, w, h, null).labels).toEqual([]);
  }
  expect(planFlightLabels(m, NaN, 900, 570, null).labels).toEqual([]);
});

test("depth-window statuses distinguish missing labels from missing coordinates", () => {
  const m = model([record("near"), record("far", 12)]);
  const window = flightDepthWindow(m, 0, 900, 570);
  expect(window.min).toBeGreaterThanOrEqual(m.bounds.min);
  expect(window.max).toBeLessThanOrEqual(m.bounds.max);
  expect(window.min).toBeLessThanOrEqual(0); expect(window.max).toBeGreaterThan(0);
  expect(flightRecordLocation(m.records[0], 0, window, new Set(["near"]))).toBe("Labeled in view");
  expect(flightRecordLocation(m.records[0], 0, window, new Set())).toBe("In depth window · not labeled");
  expect(flightRecordLocation(m.records[1], 0, window, new Set())).toBe("Ahead of this depth window");
  expect(flightRecordLocation(undefined, 0, window, new Set())).toBe("Unpositioned");
  const end = flightDepthWindow(m, 16, 366, 490);
  expect(flightRecordLocation(m.records[0], 16, end, new Set())).toBe("Behind this depth window");
});

test("label planner benchmark reports reproducible 1k and 10k workloads, not GPU performance", () => {
  for (const count of [1000, 10000]) {
    // Dense worst-case candidate pressure; fixture construction is outside the timer.
    const m = model(Array.from({ length: count }, (_, i) => ({ ...record(`benchmark-${String(i).padStart(5, "0")}`), x: i % 2 ? 3.3 : -3.3, y: (i % 5 - 2) * 1.3 })));
    for (let i = 0; i < 5; i++) planFlightLabels(m, 0, 900, 570, m.records[count - 1].id);
    const timings: number[] = [];
    for (let i = 0; i < 30; i++) {
      const start = performance.now();
      const result = planFlightLabels(m, 0, 900, 570, m.records[count - 1].id);
      timings.push(performance.now() - start);
      expect(result.candidateCount).toBeLessThanOrEqual(64);
      expect(result.labels.length).toBeLessThanOrEqual(7);
    }
    timings.sort((a, b) => a - b);
    console.log("FLIGHT_LABEL_BENCHMARK " + JSON.stringify({ records: count, width: 900, height: 570, samples: timings.length,
      median_ms: Number(timings[15].toFixed(3)), p95_ms: Number(timings[28].toFixed(3)), max_ms: Number(timings[29].toFixed(3)), scope: "pure label planner only" }));
  }
});
