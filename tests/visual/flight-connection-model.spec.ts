import { expect, test } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";
import type { FlightJourney } from "../../src/lib/flight-journeys";
import { buildFlightModel } from "../../src/lib/flight";
import { buildFlightConnection, connectionPlacement, flightOverviewX } from "../../src/lib/flight-connection";

function item(id: string, low?: number, high = low): ExplorerItem {
  return { id, name: id, summary: "Synthetic fixture", domains: ["test"], lane: "Biological", profileType: "periodic", axisKind: "temporal_frequency",
    markKind: low === high ? "point" : "band", display: low === undefined ? null : { lowHz: low, highHz: high!, mode: "native", nativeLabel: `${low} Hz`, note: "Fixture" },
    sources: [], provenance: [], relationships: [] };
}
function journey(a: ExplorerItem, b: ExplorerItem): FlightJourney {
  return { id: "test-path", title: "Test path", summary: "Synthetic", steps: [a, b].map((i) => ({ recordId: i.id, label: i.name, system: "Fixture", observable: "Fixture" })),
    hops: [{ id: "edge", type: "TRANSDUCES_TO", category: "physical", description: "Source-validated fixture", sourceId: a.id, targetId: b.id,
      ownerId: "third-record", ownerName: "Third record", evidence: { basis: "established_reference", review_status: "reviewed", source_refs: [{ id: "owner-source" }] },
      sources: [{ id: "owner-source", title: "Owner source", url: "https://example.org/owner" }] }] };
}
function fixture(a = item("a", 32768), b = item("b", 1)) {
  const items = [a, b], path = journey(a, b), model = buildFlightModel(items, ["Biological"]);
  return { items, path, model };
}

test("trace retains exact endpoint objects and owner-resolved relationship evidence without mutation", () => {
  const f = fixture(), before = JSON.stringify(f);
  const trace = buildFlightConnection(f.path, "b", f.items, f.model)!;
  expect(trace.source.item).toBe(f.items[0]); expect(trace.target.item).toBe(f.items[1]);
  expect(trace.source.position).toBe(f.model.records.find((r) => r.id === "a"));
  expect(trace.hop).toBe(f.path.hops[0]); expect(trace.hop.ownerId).toBe("third-record");
  expect(trace.hop.sources[0].url).toBe("https://example.org/owner");
  expect(JSON.stringify(f)).toBe(before);
});
test("process direction distinguishes falling, rising, overlapping and equal display extents", () => {
  for (const [a, b, placement] of [
    [item("a", 32768), item("b", 1), "lower"], [item("a", 1), item("b", 32768), "higher"],
    [item("a", 1, 2), item("b", 1.5, 3), "overlap"], [item("a", 1, 2), item("b", 1, 2), "same-extent"],
  ] as const) {
    const f = fixture(a, b); expect(buildFlightConnection(f.path, "b", f.items, f.model)?.placement).toBe(placement);
    expect(buildFlightConnection(f.path, "a", f.items, f.model)?.hop).toBe(f.path.hops[0]);
  }
});
test("missing frequencies remain null, including when both endpoints are unpositioned", () => {
  for (const f of [fixture(item("a", 440), item("b")), fixture(item("a"), item("b"))]) {
    const trace = buildFlightConnection(f.path, "b", f.items, f.model)!;
    expect(trace.placement).toBe("unpositioned"); expect(trace.target.position).toBeNull();
    expect(trace.target.item.display).toBeNull();
  }
});
test("line gaps never become overlap and all real spectral anchors survive", () => {
  const a = { ...item("a", 1, 10000), markKind: "lines" as const, display: { ...item("a", 1, 10000).display!, positionsHz: [1, 9999, 10000] } };
  const f = fixture(a, item("b", 10, 100));
  const trace = buildFlightConnection(f.path, "b", f.items, f.model)!;
  expect(trace.placement).toBe("separate-lines");
  expect(trace.source.position?.lines).toEqual([1, 9999, 10000].map(Math.log10));
  expect(connectionPlacement(trace.source.position, { ...trace.target.position!, low: Math.log10(9999), high: 4 })).toBe("overlap");
});
test("event rates and claim references retain their own semantics", () => {
  const a = { ...item("a", 1, 100 / 60), profileType: "event_rate", axisKind: "event_rate" };
  const b = { ...item("b", 1), markKind: "reference" as const, display: { ...item("b", 1).display!, mode: "claim-reference" as const } };
  const f = fixture(a, b), trace = buildFlightConnection(f.path, "b", f.items, f.model)!;
  expect(trace.source.item.profileType).toBe("event_rate"); expect(trace.target.position?.kind).toBe("reference");
  expect(trace.target.item.display?.mode).toBe("claim-reference"); expect(trace.source.item.display?.highHz).toBe(100 / 60);
});
test("unknown stages, missing records, reversed and unsourced edges cannot create a trace", () => {
  const f = fixture();
  expect(buildFlightConnection(f.path, "other", f.items, f.model)).toBeNull();
  expect(buildFlightConnection(f.path, "b", f.items.slice(0, 1), f.model)).toBeNull();
  for (const changes of [{ sourceId: "b", targetId: "a" }, { category: "numerical" }, { sources: [] }, { ownerId: "" }]) {
    const path = { ...f.path, hops: [{ ...f.path.hops[0], ...changes }] };
    expect(buildFlightConnection(path, "b", f.items, f.model)).toBeNull();
  }
});
test("invalid geometry cannot place an endpoint and invalid scale bounds reject the trace", () => {
  const f = fixture();
  for (const changes of [{ low: NaN }, { high: Infinity }, { low: 100, high: 1 }, { kind: "lines" as const, lines: [] }, { lines: [NaN] }]) {
    const model = { ...f.model, records: f.model.records.map((r) => r.id === "b" ? { ...r, ...changes } : r) };
    expect(buildFlightConnection(f.path, "b", f.items, model)?.target.position).toBeNull();
  }
  for (const bounds of [{ min: 0, max: 0 }, { min: NaN, max: 4 }, { min: 4, max: 0 }]) {
    expect(buildFlightConnection(f.path, "b", f.items, { ...f.model, bounds })).toBeNull();
  }
});
test("navigator and trace use the same full logarithmic scale without rounding or moving marks", () => {
  const bounds = { min: -2, max: 16 };
  expect(flightOverviewX(bounds.min, bounds)).toBe(10); expect(flightOverviewX(bounds.max, bounds)).toBe(990);
  expect(flightOverviewX(7, bounds)).toBe(500);
  const low = Math.log10(9999), high = Math.log10(10000);
  expect(flightOverviewX(low, bounds)).toBeLessThan(flightOverviewX(high, bounds));
  expect((flightOverviewX(low, bounds) - 10) / 980 * 18 - 2).toBeCloseTo(low, 14);
});
