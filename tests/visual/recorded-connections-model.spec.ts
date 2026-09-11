import { expect, test } from "@playwright/test";
import graphSchema from "../../schema/v0/graph.schema.json" with { type: "json" };
import type { ExplorerItem } from "../../src/lib/corpus";
import { buildFlightModel } from "../../src/lib/flight";
import { connectionPlacement } from "../../src/lib/flight-connection";
import { buildRecordedConnections, connectionsFor, readConnectionState, connectionSearch, CONNECTION_MEANING,
  type ConnectionRecord, type ConnectionState } from "../../src/lib/recorded-connections";

function item(id: string, hz?: number): ExplorerItem {
  return { id, name: id, summary: "Synthetic fixture", domains: ["test"], lane: "Other", profileType: "periodic", axisKind: "temporal_frequency", markKind: "point",
    display: hz === undefined ? null : { lowHz: hz, highHz: hz, nativeLabel: `${hz} Hz`, mode: "native", note: "fixture" }, sources: [], provenance: [], relationships: [] };
}
const items = [item("a", 100), item("b", 1), item("owner")];
function records(): ConnectionRecord[] {
  return [{ id: "a", name: "A", sources: [{ id: "shared", title: "Wrong endpoint source" }] }, { id: "b", name: "B" },
    { id: "owner", name: "Edge owner", sources: [{ id: "shared", title: "Correct owner source", url: "https://example.org/source" }], relationships: [{
      id: "edge", type: "DIVIDED_TO", category: "physical", description: "Fixture division", source_ref: { id: "a", scope: "atlas" }, target_ref: { id: "b", scope: "atlas" },
      evidence: { basis: "computed_derivation", review_status: "reviewed", mechanism_status: "known", source_refs: [{ id: "shared" }] },
    }] }];
}

test("record index preserves original owner evidence, objects and stable ordering without mutation", () => {
  const input = records(), original = JSON.stringify(input), catalog = buildRecordedConnections(input, items);
  expect(catalog.edges).toHaveLength(1); expect(catalog.nodeEdges).toHaveLength(0);
  expect(catalog.edges[0].evidence).toBe(input[2].relationships![0].evidence);
  expect(catalog.edges[0].sources[0]).toBe(input[2].sources![0]);
  expect(catalog.edges[0].sources[0].title).toBe("Correct owner source");
  expect(catalog.edges[0].ownerId).toBe("owner");
  expect(buildRecordedConnections([...input].reverse(), [...items].reverse())).toEqual(catalog);
  expect(JSON.stringify(input)).toBe(original);
});
test("incoming browsing never reverses a stored edge, merges parallel edges or duplicates self links", () => {
  const input = records(), first = input[2].relationships![0];
  input[2].relationships!.push({ ...first, id: "numerical", type: "SAME_NUMERICAL_FREQUENCY_AS", category: "numerical" }, { ...first, id: "self", target_ref: { id: "a", scope: "atlas" } });
  const catalog = buildRecordedConnections(input, items);
  expect(connectionsFor(catalog, "a")).toHaveLength(3); expect(connectionsFor(catalog, "b")).toHaveLength(2);
  expect(connectionsFor(catalog, "b", "physical")[0]).toMatchObject({ sourceId: "a", targetId: "b" });
  expect(connectionsFor(catalog, "a").filter((entry) => entry.id === "self")).toHaveLength(1);
});
test("every current schema relationship category remains explicit rather than falling back to physical", () => {
  for (const branch of graphSchema.$defs.relationship.allOf[0].oneOf) {
    const category = branch.properties.category.const;
    const definition = branch.properties.type as { enum?: string[]; const?: string };
    const types = definition.enum ?? [definition.const!];
    for (const type of types) {
      const input = records(); Object.assign(input[2].relationships![0], { type, category });
      expect(buildRecordedConnections(input, items).edges[0].category).toBe(category);
    }
    expect(CONNECTION_MEANING[category as keyof typeof CONNECTION_MEANING]).toBeDefined();
  }
  expect(CONNECTION_MEANING.numerical.caution).toContain("not evidence");
  expect(CONNECTION_MEANING.statistical.caution).toContain("not causation");
  expect(CONNECTION_MEANING.epistemic.caution).toContain("not an established");
});
test("local and Atlas-scoped non-record nodes are accounted for without replacing them by their owner", () => {
  const input = records(), first = input[2].relationships![0];
  input[2].relationships!.push({ ...first, id: "local-node", source_ref: { id: "observable.local" } },
    { ...first, id: "atlas-node", target_ref: { id: "observable.remote", scope: "atlas" } });
  const catalog = buildRecordedConnections(input, items);
  expect(catalog.edges).toHaveLength(1); expect(catalog.nodeEdges).toHaveLength(2);
  expect(catalog.nodeEdges.find((entry) => entry.id === "local-node")).toMatchObject({ sourceId: "observable.local", ownerId: "owner" });
  expect(catalog.edges.some((edge) => edge.sourceId === "owner")).toBe(false);
});
test("local references cannot resolve foreign roots and unsupported scopes fail closed", () => {
  const input = records(); input[2].relationships![0].source_ref = { id: "a" };
  expect(() => buildRecordedConnections(input, items)).toThrow(/Local reference/);
  input[2].relationships![0].source_ref = { id: "a", scope: "external" };
  expect(() => buildRecordedConnections(input, items)).toThrow(/scope/);
});
test("missing owner sources cannot be borrowed from an endpoint with the same source ID", () => {
  const input = records(); input[2].sources = [];
  expect(() => buildRecordedConnections(input, items)).toThrow(/Unresolved source shared in owner owner/);
  input[2].sources = [{ id: "shared", title: "one" }, { id: "shared", title: "two" }];
  expect(() => buildRecordedConnections(input, items)).toThrow(/Duplicate/);
});
test("duplicates, missing observations and mismatched categories reject inconsistent projections", () => {
  const input = records();
  expect(() => buildRecordedConnections([...input, input[0]], items)).toThrow(/Duplicate/);
  expect(() => buildRecordedConnections(input, [...items, items[0]])).toThrow(/Duplicate/);
  expect(() => buildRecordedConnections(input, items.filter((entry) => entry.id !== "a"))).toThrow(/Missing observation/);
  input[2].relationships!.push(input[2].relationships![0]); expect(() => buildRecordedConnections(input, items)).toThrow(/Duplicate/);
  input[2].relationships!.pop(); input[2].relationships![0].category = "numerical";
  expect(() => buildRecordedConnections(input, items)).toThrow(/mismatch/);
});
test("missing description and evidence remain explicit absences, not copied quantitative provenance", () => {
  const input = records(); delete input[2].relationships![0].description; delete input[2].relationships![0].evidence;
  const edge = buildRecordedConnections(input, items).edges[0];
  expect(edge.description).toBeNull(); expect(edge.evidence).toBeNull(); expect(edge.sources).toEqual([]);
});
test("URL state restores incoming perspective and rejects foreign edge/category combinations", () => {
  const catalog = buildRecordedConnections(records(), items);
  expect(readConnectionState("?edge=edge", catalog, items)).toMatchObject({ entityId: "a", edgeId: "edge" });
  expect(readConnectionState("?entity=b&edge=edge", catalog, items)).toMatchObject({ entityId: "b", edgeId: "edge" });
  expect(readConnectionState("?entity=owner&edge=edge", catalog, items).edgeId).toBeNull();
  expect(readConnectionState("?entity=a&edge=edge&kind=numerical", catalog, items).edgeId).toBeNull();
  for (const id of ["missing", "constructor", "__proto__"]) expect(readConnectionState(`?edge=${id}`, catalog, items).edgeId).toBeNull();
});
test("state serialization retains only valid selected IDs and preserves unrelated query parameters", () => {
  const catalog = buildRecordedConnections(records(), items);
  const state: ConnectionState = { entityId: "b", edgeId: "edge", category: "physical", query: "  Quartz & β  " };
  const query = connectionSearch("?utm_source=test&edge=old", state);
  expect(new URLSearchParams(query).get("utm_source")).toBe("test");
  expect(readConnectionState(query, catalog, items)).toEqual(state);
  const cleared = new URLSearchParams(connectionSearch(query, { ...state, edgeId: null, category: "all", query: "" }));
  for (const key of ["edge", "kind", "q"]) expect(cleared.has(key)).toBe(false);
  expect(readConnectionState("?q=" + "x".repeat(2000), catalog, items).query).toHaveLength(1000);
});
test("comparison uses original event/reference/line coordinates without filling spectral gaps", () => {
  const a = { ...item("a", 1), profileType: "event_rate", axisKind: "event_rate", display: { ...item("a", 1).display!, highHz: 100, nativeLabel: "60–6000 bpm" } };
  const b = { ...item("b", 10), markKind: "reference" as const, display: { ...item("b", 10).display!, mode: "claim-reference" as const } };
  const s = { ...item("s", 1), markKind: "lines" as const, display: { ...item("s", 1).display!, highHz: 100, positionsHz: [1, 100] } };
  const original = JSON.stringify([a, b, s]);
  const model = buildFlightModel([a, b, s], ["Other"]), get = (id: string) => model.records.find((entry) => entry.id === id)!;
  expect(connectionPlacement(get("s"), get("b"))).toBe("separate-lines"); expect(get("s").lines).toEqual([0, 2]);
  expect(get("b").kind).toBe("reference"); expect(JSON.stringify([a, b, s])).toBe(original);
  expect(connectionPlacement(get("a"), null)).toBe("unpositioned");
});
test("empty corpora and isolated observations recover without inventing a link", () => {
  const empty = buildRecordedConnections([], []);
  expect(readConnectionState("?entity=anything&edge=anything", empty, [])).toMatchObject({ entityId: null, edgeId: null });
  const isolated = buildRecordedConnections([{ id: "alone", name: "Alone" }], [item("alone")]);
  expect(connectionsFor(isolated, "alone")).toEqual([]); expect(isolated.edges).toEqual([]);
});
