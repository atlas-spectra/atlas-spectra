import { expect, test } from "@playwright/test";
import { CONNECTION_CATEGORIES, connectionSearch, type ConnectionCatalog, type RecordedConnection } from "../../src/lib/recorded-connections";
import { findRecordedPath, newRecordedPath, readRecordedPath, recordedPathSearch, PATH_MAX_HOPS, PATH_MAX_EXAMINATIONS,
  PATH_MAX_NODES, PATH_MAX_EDGES, type RecordedPathState } from "../../src/lib/recorded-paths";

function edge(id: string, a: string, b: string, category: RecordedConnection["category"] = "physical"): RecordedConnection {
  return { id, sourceId: a, targetId: b, type: category === "numerical" ? "SAME_NUMERICAL_FREQUENCY_AS" : "COUPLES_TO", category,
    description: "Stored fixture relationship", ownerId: "original-owner", ownerName: "Original owner",
    evidence: { basis: "model_derived", review_status: "unreviewed", mechanism_status: "proposed", source_refs: [{ id: "s" }] },
    sources: [{ id: "s", title: "Owner-local fixture source" }] };
}
const catalog = (edges: RecordedConnection[]): ConnectionCatalog => ({ edges, nodeEdges: [] });
const state = (fromId: string, toId: string, extra: Partial<RecordedPathState> = {}): RecordedPathState => ({ ...newRecordedPath(fromId), toId, ...extra });
const ids = new Set(["a", "b", "c", "d", "isolated"]);

test("shortest recorded route keeps exact edge and evidence objects without mutation or causal closure", () => {
  const ab = edge("ab", "a", "b"), bc = edge("bc", "b", "c"), cd = edge("cd", "c", "d"), bd = edge("bd", "b", "d");
  const graph = catalog([cd, bc, ab, bd]), before = JSON.stringify(graph);
  const found = findRecordedPath(graph, ids, state("a", "d"));
  expect(found.status).toBe("found"); expect(found.steps.map((step) => step.edge.id)).toEqual(["ab", "bd"]);
  expect(found.steps[0].edge).toBe(ab); expect(found.steps[0].edge.evidence).toBe(ab.evidence);
  expect(found.steps[0].edge.sources).toBe(ab.sources); expect(JSON.stringify(graph)).toBe(before);
  expect(graph.edges.some((entry) => entry.sourceId === "a" && entry.targetId === "d")).toBe(false);
});
test("equal-length alternatives and parallel edges use stable IDs, not input order or evidence ranking", () => {
  const first = { ...edge("01", "a", "b"), evidence: null, sources: [] };
  const list = [edge("02", "a", "b"), edge("03", "a", "c"), edge("bd", "b", "d"), edge("cd", "c", "d"), first];
  for (const entries of [list, [...list].reverse(), [list[2], ...list.slice(0, 2), ...list.slice(3)]]) {
    const found = findRecordedPath(catalog(entries), ids, state("a", "d"));
    expect(found.steps.map((step) => step.edge.id)).toEqual(["01", "bd"]); expect(found.steps[0].edge.evidence).toBeNull();
  }
});
test("physical-only searches never silently cross a numerical edge", () => {
  const graph = catalog([edge("ab", "a", "b", "numerical"), edge("bc", "b", "c")]);
  expect(findRecordedPath(graph, ids, state("a", "c")).status).toBe("not-found");
  const found = findRecordedPath(graph, ids, state("a", "c", { kinds: "all" }));
  expect(found.status).toBe("found"); expect(found.steps[0].edge.category).toBe("numerical");
});
test("reverse traversal requires opt-in and cannot reverse the stored relationship", () => {
  const ab = edge("ab", "a", "b"), cb = edge("cb", "c", "b");
  expect(findRecordedPath(catalog([ab, cb]), ids, state("a", "c")).status).toBe("not-found");
  const found = findRecordedPath(catalog([ab, cb]), ids, state("a", "c", { direction: "either" }));
  expect(found.steps.map((step) => step.reversed)).toEqual([false, true]);
  expect(found.steps[1]).toMatchObject({ fromId: "b", toId: "c", edge: { sourceId: "c", targetId: "b" } });
  expect(found.steps[1].edge).toBe(cb);
});
test("cycles and self links terminate while identical endpoints create no synthetic self edge", () => {
  const graph = catalog([edge("aa", "a", "a"), edge("ab", "a", "b"), edge("ba", "b", "a")]);
  expect(findRecordedPath(graph, ids, state("a", "isolated"))).toMatchObject({ status: "not-found", visited: 2 });
  expect(findRecordedPath(graph, ids, state("a", "a"))).toMatchObject({ status: "same", steps: [], examined: 0 });
});
test("unknown quantities do not block real edges and equal numbers cannot create absent edges", () => {
  const graph = catalog([edge("unpositioned", "a", "b")]);
  expect(findRecordedPath(graph, ids, state("a", "b")).status).toBe("found");
  expect(findRecordedPath(graph, ids, state("a", "c")).status).toBe("not-found");
  expect(JSON.stringify(findRecordedPath(graph, ids, state("a", "b")))).not.toContain("frequency");
});
test("the hop boundary includes a six-link route and explicitly reports unexplored longer routes", () => {
  const nodes = Array.from({ length: PATH_MAX_HOPS + 2 }, (_, i) => String(i));
  const graph = catalog(nodes.slice(1).map((id, i) => edge(`step-${i}`, String(i), id)));
  expect(findRecordedPath(graph, new Set(nodes), state("0", String(PATH_MAX_HOPS))).steps).toHaveLength(PATH_MAX_HOPS);
  expect(findRecordedPath(graph, new Set(nodes), state("0", String(PATH_MAX_HOPS + 1)))).toMatchObject({ status: "hop-limit", steps: [] });
});
test("work exhaustion is explicit rather than reported as no path", () => {
  const nodes = Array.from({ length: 150 }, (_, i) => String(i));
  const edges = nodes.flatMap((a) => nodes.map((b) => edge(`${a}:${b}`, a, b)));
  const found = findRecordedPath(catalog(edges), new Set([...nodes, "isolated"]), state("0", "isolated"));
  expect(found.status).toBe("work-limit"); expect(found.examined).toBe(PATH_MAX_EXAMINATIONS); expect(found.steps).toEqual([]);
});
test("catalog size limits are checked before graph preparation", () => {
  const tooManyNodes = new Set(Array.from({ length: PATH_MAX_NODES + 1 }, (_, i) => String(i)));
  expect(findRecordedPath(catalog([]), tooManyNodes, state("0", "1")).status).toBe("graph-limit");
  const repeated = Array.from({ length: PATH_MAX_EDGES + 1 }, () => edge("ab", "a", "b"));
  expect(findRecordedPath(catalog(repeated), ids, state("a", "b")).status).toBe("graph-limit");
});
test("invalid endpoints, duplicate edges and dangling record references fail explicitly", () => {
  expect(findRecordedPath(catalog([]), ids, state("missing", "a")).status).toBe("invalid");
  expect(findRecordedPath(catalog([]), ids, { ...state("a", "b"), direction: "random" } as unknown as RecordedPathState).status).toBe("invalid");
  expect(findRecordedPath(catalog([edge("x", "a", "b"), edge("x", "a", "c")]), ids, state("a", "b")).status).toBe("invalid-graph");
  expect(findRecordedPath(catalog([edge("x", "a", "missing")]), ids, state("a", "b")).status).toBe("invalid-graph");
});
test("all recorded categories retain their exact qualification; none are promoted to physical", () => {
  for (const category of CONNECTION_CATEGORIES) {
    const e = edge("category", "a", "b", category);
    const found = findRecordedPath(catalog([e]), ids, state("a", "b", { kinds: "all" }));
    expect(found.steps[0].edge.category).toBe(category); expect(found.steps[0].edge.evidence?.mechanism_status).toBe("proposed");
  }
});
test("node-level edges are not replaced by parent records in the path graph", () => {
  const graph: ConnectionCatalog = { edges: [], nodeEdges: [{ id: "node", ownerId: "a", ownerName: "A", sourceId: "a", targetId: "b" }] };
  expect(findRecordedPath(graph, ids, state("a", "b")).status).toBe("not-found");
});
test("path URL parsing keeps invalid IDs missing and malformed options restrictive", () => {
  expect(readRecordedPath("?path=unknown&path_from=a&path_to=b", ids)).toBeNull();
  const parsed = readRecordedPath("?path=recorded&path_from=missing&path_to=b&path_direction=constructor&path_kinds=__proto__", ids);
  expect(parsed).toEqual({ fromId: null, toId: "b", direction: "forward", kinds: "physical" });
  expect(readRecordedPath(recordedPathSearch("", state("a", "d", { direction: "either", kinds: "all" })), ids)).toEqual(state("a", "d", { direction: "either", kinds: "all" }));
});
test("path and single-link URL owners coexist without deleting one another or unrelated state", () => {
  const single = { entityId: "b", edgeId: "ab", category: "all" as const, query: "test" };
  const url = connectionSearch(recordedPathSearch("?utm_source=test", state("a", "d")), single);
  expect(readRecordedPath(url, ids)).toEqual(state("a", "d"));
  const closed = new URLSearchParams(recordedPathSearch(url, null));
  expect(closed.get("entity")).toBe("b"); expect(closed.get("edge")).toBe("ab"); expect(closed.get("q")).toBe("test"); expect(closed.get("utm_source")).toBe("test");
  expect([...closed.keys()].some((key) => key.startsWith("path"))).toBe(false);
});
test("record IDs are Map keys, not object properties with prototype fallbacks", () => {
  const ids = new Set(["constructor", "__proto__", "toString"]);
  const graph = catalog([edge("x", "constructor", "__proto__"), edge("y", "__proto__", "toString")]);
  expect(findRecordedPath(graph, ids, state("constructor", "toString")).steps).toHaveLength(2);
});
