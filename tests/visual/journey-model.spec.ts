import { expect, test } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";
import { buildJourneys, parseJourneyDocument, readJourneyState, journeyRecordLink, safeSourceUrl, type JourneyRecord } from "../../src/lib/signal-journeys";

function item(id: string): ExplorerItem {
  return { id, name: id, summary: "Fixture", lane: "Other", domains: [], profileType: "periodic", axisKind: "temporal_frequency", markKind: "point",
    display: { lowHz: 440, highHz: 440, mode: "native", nativeLabel: "440 Hz", note: "Fixture" }, sources: [], provenance: [], relationships: [] };
}
function fixture() {
  const document = { version: "0.1.0", journeys: [{ id: "test-path", title: "Path", summary: "Fixture", steps: [{ recordId: "a", label: "Input" }, { recordId: "b", label: "Output" }], edgeIds: ["edge.a-to-b"] }] };
  const records: JourneyRecord[] = [
    { id: "a", name: "A", sources: [{ id: "source.shared", title: "Wrong endpoint source", url: "https://example.org/wrong" }] },
    { id: "b", name: "B" },
    { id: "owner", name: "Owner record", sources: [{ id: "source.shared", title: "Correct edge source", url: "https://example.org/edge" }], relationships: [{ id: "edge.a-to-b", type: "TRANSDUCES_TO", category: "physical", description: "The actual recorded transition.", source_ref: { id: "a", scope: "atlas" }, target_ref: { id: "b", scope: "atlas" }, evidence: { basis: "established_reference", review_status: "reviewed", mechanism_status: "known", source_refs: [{ id: "source.shared" }] } }] },
  ];
  return { document, records, items: [item("a"), item("b")] };
}

test("journeys keep original observations, positions and provenance without mutation", () => {
  const f = fixture(), snapshot = JSON.stringify(f);
  const [journey] = buildJourneys(f.document, f.records, f.items);
  expect(journey.steps[0].item).toBe(f.items[0]);
  expect(journey.steps[1].item).toBe(f.items[1]);
  expect(journey.hops[0].description).toBe("The actual recorded transition.");
  expect(journey.hops[0].evidence).toEqual(f.records[2].relationships![0].evidence);
  expect(JSON.stringify(f)).toBe(snapshot);
});

test("edge sources resolve in the owning manifest even when neither endpoint owns the edge", () => {
  const f = fixture();
  const edge = buildJourneys(f.document, f.records, f.items)[0].hops[0];
  expect(edge.ownerId).toBe("owner");
  expect(edge.sources.map((source) => source.title)).toEqual(["Correct edge source"]);
  f.records[2].sources = [];
  expect(() => buildJourneys(f.document, f.records, f.items)).toThrow(/unresolved owner source/);
});

test("broken, reversed and numerical hops cannot become a physical process path", () => {
  for (const mutation of ["missing", "reversed", "numerical", "external", "unsourced", "description"]) {
    const f = fixture(), edge = f.records[2].relationships![0];
    if (mutation === "missing") f.document.journeys[0].edgeIds[0] = "absent";
    if (mutation === "reversed") { edge.source_ref.id = "b"; edge.target_ref.id = "a"; }
    if (mutation === "numerical") { edge.category = "numerical"; edge.type = "SAME_NUMERICAL_FREQUENCY_AS"; }
    if (mutation === "external") edge.target_ref.scope = "external";
    if (mutation === "unsourced") edge.evidence!.source_refs = [];
    if (mutation === "description") edge.description = "   ";
    expect(() => buildJourneys(f.document, f.records, f.items), mutation).toThrow();
  }
});

test("presentation shape, cardinality and duplicate IDs fail at the build boundary", () => {
  const f = fixture();
  const invalid: unknown[] = [null, {}, { ...f.document, version: "other" }, { ...f.document, frequency: 440 }];
  const extra = structuredClone(f.document);
  Object.assign(extra.journeys[0].steps[0], { frequency: 440 }); invalid.push(extra);
  const short = structuredClone(f.document); short.journeys[0].steps.pop(); invalid.push(short);
  const blank = structuredClone(f.document); blank.journeys[0].title = "  "; invalid.push(blank);
  const duplicate = structuredClone(f.document); duplicate.journeys.push(duplicate.journeys[0]); invalid.push(duplicate);
  const duplicateStep = structuredClone(f.document); duplicateStep.journeys[0].steps[1].recordId = "a"; invalid.push(duplicateStep);
  for (const value of invalid) expect(() => parseJourneyDocument(value)).toThrow();
  expect(() => buildJourneys(f.document, f.records, [f.items[0]])).toThrow(/missing record/);
  expect(() => buildJourneys(f.document, [...f.records, f.records[0]], f.items)).toThrow(/Duplicate scientific ID/);
  f.records[1].relationships = f.records[2].relationships;
  expect(() => buildJourneys(f.document, f.records, f.items)).toThrow(/Duplicate scientific edge/);
});

test("unpositioned and invalid stages never inherit a preceding frequency in Atlas or Flight links", () => {
  for (const display of [null, { ...item("a").display!, lowHz: NaN }]) {
    const unknown = { ...item("unresolved"), display };
    for (const mode of ["explore", "flight"] as const) {
      const url = new URL(journeyRecordLink(unknown, "/atlas-spectra/", mode), "https://example.org");
      expect(url.searchParams.get("entity")).toBe("unresolved");
      expect([...url.searchParams.keys()]).toEqual(["entity"]);
    }
  }
});

test("line and reference links use real coordinates and stable canonical identifiers", () => {
  const spectrum = item("spectrum"); spectrum.markKind = "lines"; spectrum.profileType = "discrete_lines";
  spectrum.display = { ...spectrum.display!, lowHz: 10, highHz: 10000, positionsHz: [10, 10000] };
  const url = new URL(journeyRecordLink(spectrum, "/atlas-spectra/", "explore"), "https://example.org");
  expect(Number(url.searchParams.get("center"))).toBe(Math.log10(10));
  const reference = item("perception.pitch.a4-reference"); reference.markKind = "reference";
  reference.display!.mode = "claim-reference";
  const before = JSON.stringify(reference);
  expect(new URL(journeyRecordLink(reference, "/atlas-spectra/", "flight"), "https://example.org").searchParams.get("at")).toBe(String(Math.log10(440)));
  expect(JSON.stringify(reference)).toBe(before);
});

test("URL restoration validates both journey and stage membership, not numeric or prototype coercion", () => {
  const f = fixture(), journeys = buildJourneys(f.document, f.records, f.items);
  expect(readJourneyState("?journey=test-path&stage=b", journeys)).toEqual({ journey: "test-path", stage: "b" });
  for (const search of ["", "?journey=__proto__&stage=9999999999", "?journey=other&stage=absent", "?stage=%zz"]) {
    expect(readJourneyState(search, journeys)).toEqual({ journey: "test-path", stage: "a" });
  }
  expect(() => readJourneyState("", [])).toThrow();
});

test("source links allow only absolute HTTP(S) URLs", () => {
  expect(safeSourceUrl("https://example.org/source")).toBe("https://example.org/source");
  for (const url of [undefined, "javascript:alert(1)", "data:text/html,test", "/relative", "not a url"]) expect(safeSourceUrl(url)).toBeUndefined();
});
