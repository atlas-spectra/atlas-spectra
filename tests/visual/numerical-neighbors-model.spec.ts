import { expect, test } from "@playwright/test";
import type { ExplorerItem, Manifest, Quantity } from "../../src/lib/corpus";
import { buildNumericalInputs, findNumericalNeighbors, readNumericalState, numericalSearch,
  NUMERICAL_MAX_RECORDS, NUMERICAL_MAX_SEGMENTS, type NumericalInput, type NumericalReport, type NumericRange } from "../../src/lib/numerical-neighbors";
import fixtureJSON from "../fixtures/numerical-neighbor-report.json" with { type: "json" };
const fixture = fixtureJSON as NumericalReport;
const input = (id: string, segmentsHz: NumericRange[] = [[1, 1]], extra: Partial<NumericalInput> = {}): NumericalInput => ({
  id, name: `Fixture ${id}`, profileType: "periodic", axisKind: "temporal_frequency", coordinateMode: "native",
  nativeLabel: "1 Hz", coordinateNote: "Native temporal-frequency coordinate", quantityTargets: ["/frequency_profile/fundamental"],
  segmentsHz, status: "eligible", reason: null, ...extra,
});
const unknown = (id: string) => input(id, [], { profileType: "unknown", coordinateMode: null, nativeLabel: "Unresolved", quantityTargets: [],
  status: "unpositioned", reason: "No supported common-scale coordinate is assigned." });
const run = (inputs: NumericalInput[], anchorId = "a", includeReferences = false) => findNumericalNeighbors(inputs, { anchorId, includeReferences });
function pair(q: Quantity = { value: 1, unit: "Hz" }) {
  const m: Manifest = { schema_version: "0.1.0", id: "a", name: "Source a", summary: "Fixture", domains: [],
    frequency_profile: { type: "periodic", axis: { kind: "temporal_frequency" }, fundamental: q } };
  const item: ExplorerItem = { id: m.id, name: m.name, summary: m.summary, domains: [], lane: "Other", profileType: "periodic",
    axisKind: "temporal_frequency", markKind: "point", display: { lowHz: 1, highHz: 1, mode: "native", note: "Native temporal-frequency coordinate", nativeLabel: "1 Hz" },
    sources: [], provenance: [], relationships: [] };
  return { m, item };
}

test("actual computation equals the same fixture validated against JSON Schema by Python", () => {
  const inputs = [fixture.anchor!, fixture.matches[0].peer, unknown("c")];
  const before = JSON.stringify(inputs); expect(run(inputs)).toEqual(fixture); expect(JSON.stringify(inputs)).toBe(before);
});
test("peer order is deterministic, not input order or evidence ranking", () => {
  const inputs = [input("z"), input("a"), input("b")];
  expect(run(inputs)).toEqual(run([...inputs].reverse())); expect(run(inputs).matches.map((m) => m.peer.id)).toEqual(["b", "z"]);
});
test("actual line gaps never become matches through their enclosing envelope", () => {
  const a = input("a", [[1, 1], [10, 10]], { profileType: "discrete_lines" });
  expect(run([a, input("gap", [[2, 9]])]).matches).toHaveLength(0);
  expect(run([a, input("b", [[1, 10]])]).matches[0].intersections.map((v) => v.sharedHz)).toEqual([[1, 1], [10, 10]]);
});
test("boundary-only matching is distinguished from a point inside a range", () => {
  const r = run([input("a", [[1, 2]]), input("boundary"), input("interior", [[1.5, 1.5]])]);
  expect(r.matches.find((v) => v.peer.id === "boundary")?.kind).toBe("boundary-only");
  expect(r.matches.find((v) => v.peer.id === "interior")?.kind).toBe("shared-points");
});
test("same extents and positive-width partial overlaps keep their exact witnesses", () => {
  const r = run([input("a", [[1, 3]]), input("same", [[1, 3]]), input("partial", [[2, 4]])]);
  expect(r.matches.find((v) => v.peer.id === "same")?.kind).toBe("same-extent");
  expect(r.matches.find((v) => v.peer.id === "partial")).toMatchObject({ kind: "overlapping-extents", intersections: [{ anchorHz: [1, 3], peerHz: [2, 4], sharedHz: [2, 3] }] });
});
test("references require opt-in for both the anchor and peers without erasing their semantics", () => {
  const ref = input("ref", [[1, 1]], { coordinateMode: "claim-reference", profileType: "unknown", quantityTargets: ["/claims/0/object"] });
  expect(run([input("a"), ref]).counts).toMatchObject({ comparedPeers: 0, excludedPeers: 1, matches: 0 });
  expect(run([input("a"), ref], "ref").status).toBe("anchor-excluded");
  expect(run([input("a"), ref], "a", true).matches[0].peer.coordinateMode).toBe("claim-reference");
});
test("missing inputs are accounted for and a missing anchor never acquires another value", () => {
  const inputs = [input("a"), unknown("b"), input("unsupported", [], { status: "unsupported", reason: "Ranged lines", quantityTargets: [] })];
  expect(run(inputs).counts).toEqual({ catalogRecords: 3, comparedPeers: 0, excludedPeers: 2, matches: 0 });
  expect(run(inputs, "b")).toMatchObject({ status: "anchor-excluded", matches: [] });
  expect(run(inputs, "missing")).toMatchObject({ status: "anchor-required", anchor: null, matches: [] });
});
test("invalid coordinates or duplicate IDs fail instead of publishing a partial match list", () => {
  for (const n of [0, -1, Infinity, NaN]) expect(run([input("a"), input("b", [[n, n]])]).status).toBe("invalid-catalog");
  expect(run([input("a"), input("a")]).status).toBe("invalid-catalog");
  expect(run([input("a", [[2, 1]])]).status).toBe("invalid-catalog");
  expect(run([input("a", [[1, 2], [2, 3]])]).status).toBe("invalid-catalog");
});
test("exact comparisons do not silently add a rounding tolerance or claim a harmonic", () => {
  expect(run([input("a"), input("near", [[1 + Number.EPSILON, 1 + Number.EPSILON]]), input("double", [[2, 2]])]).matches).toHaveLength(0);
});
test("catalog limits are checked before scanning inputs and input line limits are explicit", () => {
  expect(run(new Array(NUMERICAL_MAX_RECORDS + 1).fill(input("a")))).toMatchObject({ status: "catalog-limit", matches: [], counts: { comparedPeers: 0 } });
  expect(run([input("a", Array.from({ length: NUMERICAL_MAX_SEGMENTS + 1 }, (_, i) => [i + 1, i + 1]))]).status).toBe("invalid-catalog");
});
test("self comparison is excluded and counts reconcile a full one-anchor scan", () => {
  const r = run([input("a"), input("b"), input("c", [[10, 20]]), unknown("d")]);
  expect(r.counts).toEqual({ catalogRecords: 4, comparedPeers: 2, excludedPeers: 1, matches: 1 });
  expect(r.matches.map((v) => v.peer.id)).toEqual(["b"]); expect(run([], "a").status).toBe("anchor-required");
});
test("build projection records exact quantity targets without mutating scientific records", () => {
  const { m, item } = pair(); const before = JSON.stringify([m, item]);
  expect(buildNumericalInputs([m], [item])[0]).toMatchObject({ status: "eligible", quantityTargets: ["/frequency_profile/fundamental"], segmentsHz: [[1, 1]] });
  expect(JSON.stringify([m, item])).toBe(before);
});
test("source quantities with missing units or invalid bounds are not trusted because display looks valid", () => {
  for (const q of [{ value: 1 }, { lower: 2, upper: 1, unit: "Hz" }, { value: 1, lower: 1, upper: 2, unit: "Hz" }, { value: -1, unit: "Hz" }]) {
    const { m, item } = pair(q); expect(buildNumericalInputs([m], [item])[0]).toMatchObject({ status: "unsupported", segmentsHz: [] });
  }
});
test("ranged spectral lines are excluded rather than represented by navigation midpoints", () => {
  const { m, item } = pair(); m.frequency_profile = { type: "discrete_lines", axis: { kind: "temporal_frequency" }, lines: [{ position: { lower: 1, upper: 3, unit: "Hz" } }] };
  item.profileType = "discrete_lines"; item.markKind = "lines"; item.display = { ...item.display!, lowHz: 1, highHz: 3, positionsHz: [2] };
  expect(buildNumericalInputs([m], [item])[0]).toMatchObject({ status: "unsupported", segmentsHz: [], reason: expect.stringContaining("midpoints") });
});
test("complete discrete lines keep their real positions, stable union and original targets", () => {
  const { m, item } = pair(); m.frequency_profile = { type: "discrete_lines", axis: { kind: "temporal_frequency" }, lines: [10, 1, 10].map((value) => ({ position: { value, unit: "Hz" } })) };
  item.profileType = "discrete_lines"; item.markKind = "lines"; item.display = { ...item.display!, lowHz: 1, highHz: 10, positionsHz: [10, 1, 10] };
  expect(buildNumericalInputs([m], [item])[0]).toMatchObject({ status: "eligible", segmentsHz: [[1, 1], [10, 10]], quantityTargets: ["/frequency_profile/lines/0/position", "/frequency_profile/lines/1/position", "/frequency_profile/lines/2/position"] });
  item.display.positionsHz = [1, 10]; expect(buildNumericalInputs([m], [item])[0].status).toBe("unsupported");
});
test("excessive line lists, partial lists and inconsistent spectral extents are explicit exclusions", () => {
  const { m, item } = pair(); m.frequency_profile = { type: "discrete_lines", axis: { kind: "temporal_frequency" }, lines: [{ position: { value: 1, unit: "Hz" } }] };
  item.profileType = "discrete_lines"; item.display!.positionsHz = [2];
  expect(buildNumericalInputs([m], [item])[0].status).toBe("unsupported");
  m.frequency_profile.lines = new Array(NUMERICAL_MAX_SEGMENTS + 1).fill({ position: { value: 1, unit: "Hz" } });
  expect(buildNumericalInputs([m], [item])[0].reason).toContain("limit");
});
test("event-rate normalization retains the original rate field and does not reclassify it", () => {
  const { m, item } = pair(); m.frequency_profile = { type: "event_rate", axis: { kind: "event_rate" }, rate: { lower: 60, upper: 100, unit: "bpm" } };
  item.profileType = "event_rate"; item.axisKind = "event_rate"; item.display = { ...item.display!, lowHz: 1, highHz: 100 / 60, mode: "normalized", nativeLabel: "60–100 bpm" };
  expect(buildNumericalInputs([m], [item])[0]).toMatchObject({ profileType: "event_rate", nativeLabel: "60–100 bpm", segmentsHz: [[1, 100 / 60]], quantityTargets: ["/frequency_profile/rate"] });
});
test("claim-reference input validates the exact claim instead of borrowing profile provenance", () => {
  const { m, item } = pair(); m.frequency_profile = { type: "unknown", axis: { kind: "temporal_frequency" } };
  m.claims = [{ id: "claim.a", object: { value: 440, unit: "Hz" } }]; item.profileType = "unknown";
  item.display = { ...item.display!, lowHz: 440, highHz: 440, mode: "claim-reference", referenceClaim: { id: "claim.a", target: "/claims/0/object" } };
  expect(buildNumericalInputs([m], [item])[0].quantityTargets).toEqual(["/claims/0/object"]);
  item.display.referenceClaim!.id = "wrong"; expect(buildNumericalInputs([m], [item])[0].status).toBe("unsupported");
});
test("projection rejects duplicate/missing source IDs and does not guess unsupported profiles", () => {
  const { m, item } = pair(); expect(() => buildNumericalInputs([m, m], [item, item])).toThrow();
  expect(() => buildNumericalInputs([{ ...m, id: "other" }], [item])).toThrow();
  m.frequency_profile.type = "unknown"; item.profileType = "unknown"; expect(buildNumericalInputs([m], [item])[0].status).toBe("unsupported");
  item.display = null; expect(buildNumericalInputs([m], [item])[0].status).toBe("unpositioned");
});
test("numerical URL parameters coexist with path, pair, search and unrelated parameters", () => {
  const original = "entity=a&edge=link&kind=physical&q=heart&path=recorded&path_from=a&path_to=b&theme=quiet";
  const state = { anchorId: "b", includeReferences: true }; const next = numericalSearch(original, state);
  expect(readNumericalState(next, new Set(["a", "b"]))).toEqual(state);
  expect(numericalSearch(next, null)).toBe(original); expect(numericalSearch(next, state)).toBe(next);
});
test("unknown identifiers and malformed reference settings never broaden a numerical search", () => {
  expect(readNumericalState("numbers=overlap&numbers_from=__proto__&numbers_refs=true", new Set(["a"]))).toEqual({ anchorId: null, includeReferences: false });
  expect(readNumericalState("numbers=other&numbers_from=a", new Set(["a"]))).toBeNull();
});
