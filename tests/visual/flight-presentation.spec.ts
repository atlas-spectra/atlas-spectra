import { expect, test } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";
import { buildFlightModel, planFlightLabels } from "../../src/lib/flight";
import { COMPACT_FLIGHT_LABEL_HEIGHT, eventRateReading, FLIGHT_SIGNAL_GUIDE, formatScaleRate, quietFlightPlan } from "../../src/lib/flight-presentation";
const guide = FLIGHT_SIGNAL_GUIDE;
function item(id: string, low = 1, high = low): ExplorerItem {
  return { id, name: id, summary: "Fixture", lane: "Biological", domains: ["biology"], profileType: "event_rate", axisKind: "event_rate", markKind: "band",
    display: { lowHz: low, highHz: high, nativeLabel: "60–100 bpm", mode: "normalized", note: "Event rate" }, sources: [], provenance: [], relationships: [] };
}
const modelFor = (items: ExplorerItem[]) => buildFlightModel(items, ["Biological"]);

test("scale readouts translate units without assigning a frequency to a record", () => {
  expect(formatScaleRate(0)).toBe("1 per second");
  expect(formatScaleRate(Math.log10(440))).toBe("440 per second");
  expect(formatScaleRate(3)).toBe("1 thousand per second");
  expect(formatScaleRate(6)).toBe("1 million per second");
  expect(formatScaleRate(-1)).toBe("0.1 per second");
  for (const n of [NaN, Infinity, -Infinity]) expect(formatScaleRate(n)).toBe("No scale position");
  expect(formatScaleRate(300)).toBe("10^300 per second");
});

test("event-rate conversions come from the adapter and preserve the original value", () => {
  const heart = item(guide.anchorId, 60 / 60, 100 / 60), before = JSON.stringify(heart);
  expect(eventRateReading(heart)).toBe("1–1.67 beat events/s");
  expect(eventRateReading(item("future.events", 90 / 60))).toBe("1.5 events/s");
  expect(eventRateReading(item(guide.deferredIds[0], 1, 100 / 60))).toBe("1–1.67 events/s");
  expect(JSON.stringify(heart)).toBe(before);
});

test("unresolved, invalid, reference and non-event observations do not get invented beat counts", () => {
  expect(eventRateReading({ ...item("unknown"), display: null })).toBeNull();
  for (const value of [0, NaN, Infinity, -1]) expect(eventRateReading(item("invalid", value))).toBeNull();
  expect(eventRateReading(item("reversed", 2, 1))).toBeNull();
  const reference = item("reference"); reference.display!.mode = "claim-reference";
  expect(eventRateReading(reference)).toBeNull();
  expect(eventRateReading({ ...item("sound"), profileType: "periodic" })).toBeNull();
});

test("compact layout reduces visual area while preserving the original anchors and priorities", () => {
  const model = modelFor(Array.from({ length: 100 }, (_, index) => item(`record-${index}`)));
  for (const width of [296, 390, 900]) {
    const source = planFlightLabels(model, 0, width, 490, "record-99");
    const plan = quietFlightPlan(model, 0, width, 490, "record-99", false);
    expect(plan.labels.length).toBeGreaterThan(0);
    expect(plan.labels.length).toBeLessThanOrEqual(width < 600 ? 2 : 3);
    expect(plan.labels[0].record.id).toBe("record-99");
    for (const label of plan.labels) {
      const original = source.labels.find((entry) => entry.record.id === label.record.id)!;
      expect(label.record).toBe(original.record);
      expect([label.coordinate, label.anchorX, label.anchorY]).toEqual([original.coordinate, original.anchorX, original.anchorY]);
      expect(label.top + label.height / 2).toBe(original.top + original.height / 2);
      expect(label.height).toBe(COMPACT_FLIGHT_LABEL_HEIGHT);
    }
  }
});

test("only explicit journey stages are deferred while the representative is visible", () => {
  const records = [item(guide.anchorId), ...guide.deferredIds.map((id) => item(id)), item("unrelated.watch", 1)];
  const model = modelFor(records), before = JSON.stringify(model);
  const plan = quietFlightPlan(model, 0, 900, 570, null, false);
  expect([...plan.deferredIds]).toEqual(guide.deferredIds);
  expect(plan.labels.some((label) => label.record.id === "unrelated.watch")).toBe(true);
  expect(plan.labels.some((label) => guide.deferredIds.includes(label.record.id))).toBe(false);
  expect(model.records).toHaveLength(4); expect(JSON.stringify(model)).toBe(before);
});

test("explicit exploration restores sensing stages and prioritizes their selection", () => {
  const model = modelFor([item(guide.anchorId), ...guide.deferredIds.map((id) => item(id))]);
  for (const selected of guide.revealIds) expect(quietFlightPlan(model, 0, 900, 570, selected, false).deferredIds.size).toBe(0);
  for (const id of guide.deferredIds) expect(quietFlightPlan(model, 0, 900, 570, id, false).labels[0].record.id).toBe(id);
  expect(quietFlightPlan(model, 0, 900, 570, null, true).deferredIds.size).toBe(0);
});

test("missing or off-screen representatives never suppress otherwise reachable stages", () => {
  const noHeart = modelFor(guide.deferredIds.map((id) => item(id)));
  expect(quietFlightPlan(noHeart, 0, 900, 570, null, false).deferredIds.size).toBe(0);
  const farHeart = modelFor([item(guide.anchorId, 1e10), ...guide.deferredIds.map((id) => item(id))]);
  expect(quietFlightPlan(farHeart, 0, 900, 570, null, false).deferredIds.size).toBe(0);
});

test("real spectral lines and reference kinds survive the compact projection", () => {
  const spectral = item("lines", 1, 10000); spectral.markKind = "lines"; spectral.display!.positionsHz = [1, 10000];
  const reference = item("reference", 10000); reference.markKind = "reference"; reference.display!.mode = "claim-reference";
  const model = modelFor([spectral, reference]);
  const result = quietFlightPlan(model, 3, 900, 570, "lines", false);
  expect(result.labels.find((entry) => entry.record.id === "lines")?.coordinate).toBe(4);
  expect(result.labels.find((entry) => entry.record.id === "reference")?.record.kind).toBe("reference");
  expect(quietFlightPlan(model, NaN, 900, 570, null, false).labels).toEqual([]);
});
