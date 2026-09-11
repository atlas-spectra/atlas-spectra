import { expect, test } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";
import type { SignalJourney, JourneyHop } from "../../src/lib/signal-journeys";
import { buildFlightModel } from "../../src/lib/flight";
import { compactFlightJourneys, readFlightJourney, flightJourneyCoordinate, flightJourneySearch, readFlightBrowseState, flightJourneyLink, type FlightBrowseState } from "../../src/lib/flight-journeys";

function item(id: string, hz?: number): ExplorerItem {
  return { id, name: id, summary: "Synthetic fixture", domains: ["test"], lane: "Biological", profileType: "periodic", axisKind: "temporal_frequency", markKind: "point",
    display: hz === undefined ? null : { lowHz: hz, highHz: hz, nativeLabel: `${hz} Hz`, mode: "native", note: "fixture" }, sources: [], provenance: [], relationships: [] };
}
const a = item("a", 440), b = item("b"), c = item("c", 1);
const hop: JourneyHop = { id: "edge", type: "TRANSDUCES_TO", category: "physical", description: "Fixture transition", sourceId: "a", targetId: "b", ownerId: "third-record", ownerName: "Third record",
  evidence: { basis: "established_reference", review_status: "reviewed", source_refs: [{ id: "owner-source" }] }, sources: [{ id: "owner-source", title: "Owner source", url: "https://example.org/source" }] };
const source: SignalJourney = { id: "test-path", title: "Test path", summary: "Synthetic", steps: [{ label: "First", item: a, system: "System A", observable: "Signal A" }, { label: "Second", item: b, system: "System B", observable: "Signal B" }], hops: [hop] };
const journeys = compactFlightJourneys([source]);
const model = buildFlightModel([a, b, c], ["Biological"]);
const view: FlightBrowseState = { at: 1.2345678901234567, selectedId: "a", detailed: true, query: "test", showAll: false };

test("Flight journey payload references observations once and preserves owner-resolved evidence", () => {
  expect(journeys[0].steps[0]).toEqual({ recordId: "a", label: "First", system: "System A", observable: "Signal A" });
  expect(JSON.stringify(journeys)).not.toContain("lowHz");
  expect(journeys[0].hops[0]).toBe(hop);
  expect(journeys[0].hops[0].ownerId).toBe("third-record");
  expect(source.steps[0].item).toBe(a);
});
test("free exploration and invalid journey IDs never silently start a tour", () => {
  for (const search of ["", "?stage=a", "?journey=missing", "?journey=__proto__", "?journey=constructor"]) expect(readFlightJourney(search, journeys)).toBeNull();
  expect(readFlightJourney("?journey=test-path&stage=b", journeys)).toEqual({ journey: "test-path", stage: "b" });
  expect(readFlightJourney("?journey=test-path&stage=c", journeys)?.stage).toBe("a");
});
test("only positioned observations supply camera targets; unknown does not inherit 440 Hz", () => {
  expect(flightJourneyCoordinate(model, "a", 0)).toBe(Math.log10(440));
  expect(flightJourneyCoordinate(model, "b", Math.log10(440))).toBeNull();
  expect(flightJourneyCoordinate(model, "missing", 3)).toBeNull();
});
test("guided navigation preserves real line anchors, including closely spaced later lines", () => {
  const spectral = { ...item("s", 1), markKind: "lines" as const, display: { ...item("s", 1).display!, highHz: 10000, positionsHz: [1, 9999, 10000] } };
  const spectrum = buildFlightModel([spectral], ["Biological"]);
  expect(flightJourneyCoordinate(spectrum, "s", Math.log10(9999))).toBe(Math.log10(9999));
  expect(spectrum.records[0].lines).toContain(flightJourneyCoordinate(spectrum, "s", 2));
});
test("URL serialization retains full precision and removes guide parameters on exit", () => {
  const guide = { journey: "test-path", stage: "a" };
  const query = flightJourneySearch("?utm_source=test&stage=old", view, guide);
  expect(new URLSearchParams(query).get("at")).toBe(String(view.at));
  expect(new URLSearchParams(query).get("utm_source")).toBe("test");
  expect(readFlightJourney(query, journeys)).toEqual(guide);
  const cleared = new URLSearchParams(flightJourneySearch(query, { ...view, selectedId: null, detailed: false }, null));
  for (const key of ["entity", "detail", "journey", "stage"]) expect(cleared.has(key)).toBe(false);
});
test("history restoration validates saved state and clamps stale coordinates", () => {
  const ids = new Set(["a", "b", "c"]);
  expect(readFlightBrowseState(view, model, ids)).toEqual(view);
  for (const raw of [null, [], {}, { ...view, at: Infinity }, { ...view, at: "3" }, { ...view, detailed: "yes" }]) expect(readFlightBrowseState(raw, model, ids)).toBeNull();
  expect(readFlightBrowseState({ ...view, at: 1e300, selectedId: "deleted" }, model, ids)).toMatchObject({ at: model.bounds.max, selectedId: null });
});
test("unknown-stage links preserve identifiers without manufacturing coordinates", () => {
  const url = new URL(flightJourneyLink("/atlas-spectra/", journeys[0], "b"), "https://example.test");
  expect(url.pathname).toBe("/atlas-spectra/flight/");
  expect(url.searchParams.get("stage")).toBe("b");
  expect(url.searchParams.has("at")).toBe(false);
});
test("reference coordinate and event-rate records are never rewritten as another signal type", () => {
  const reference = { ...item("r", 440), markKind: "reference" as const, display: { ...a.display!, mode: "claim-reference" as const } };
  const event = { ...item("event", 1), profileType: "event_rate", axisKind: "event_rate" };
  const original = JSON.stringify([reference, event]);
  const m = buildFlightModel([reference, event], ["Biological"]);
  expect(flightJourneyCoordinate(m, "r", 0)).toBe(Math.log10(440));
  expect(flightJourneyCoordinate(m, "event", 0)).toBe(0);
  expect(JSON.stringify([reference, event])).toBe(original);
});
