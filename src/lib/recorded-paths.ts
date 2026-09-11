import { CONNECTION_CATEGORIES, type ConnectionCatalog, type RecordedConnection } from "./recorded-connections";

export interface RecordedPathState {
  fromId: string | null;
  toId: string | null;
  direction: "forward" | "either";
  kinds: "physical" | "all";
}
export interface RecordedPathStep {
  edge: RecordedConnection;
  fromId: string;
  toId: string;
  /** Browsing against an edge never reverses its stored direction or mechanism. */
  reversed: boolean;
}
export const PATH_MAX_HOPS = 6;
export const PATH_MAX_NODES = 10_000;
export const PATH_MAX_EDGES = 50_000;
export const PATH_MAX_EXAMINATIONS = 20_000;
export interface RecordedPathResult {
  status: "found" | "same" | "invalid" | "invalid-graph" | "not-found" | "hop-limit" | "work-limit" | "graph-limit";
  steps: RecordedPathStep[];
  visited: number;
  examined: number;
}
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Search ONLY the stored record-level graph. Frequency is deliberately not an input.
 * One shortest route by edge count; lexical edge IDs break equal-length ties.
 * There is no confidence ranking, inferred edge, evidence promotion or causal closure.
 */
export function findRecordedPath(catalog: ConnectionCatalog, ids: ReadonlySet<string>, state: RecordedPathState): RecordedPathResult {
  let examined = 0;
  const seen = new Set<string>();
  const result = (status: RecordedPathResult["status"], steps: RecordedPathStep[] = []): RecordedPathResult => ({ status, steps, visited: seen.size, examined });
  const { fromId, toId, direction, kinds } = state;
  if (!fromId || !toId || !ids.has(fromId) || !ids.has(toId)
    || !["forward", "either"].includes(direction) || !["physical", "all"].includes(kinds)) return result("invalid");
  if (ids.size > PATH_MAX_NODES || catalog.edges.length > PATH_MAX_EDGES) return result("graph-limit");
  const edgeIds = new Set<string>();
  for (const edge of catalog.edges) {
    if (!edge.id || edgeIds.has(edge.id) || !ids.has(edge.sourceId) || !ids.has(edge.targetId)
      || !CONNECTION_CATEGORIES.includes(edge.category)) return result("invalid-graph");
    edgeIds.add(edge.id);
  }
  seen.add(fromId);
  if (fromId === toId) return result("same"); // No self-link or process is inferred.
  const adjacency = new Map<string, RecordedPathStep[]>();
  const add = (step: RecordedPathStep) => {
    const list = adjacency.get(step.fromId) ?? [];
    list.push(step); adjacency.set(step.fromId, list);
  };
  for (const edge of [...catalog.edges].sort((a, b) => compare(a.id, b.id))) {
    if (kinds === "physical" && edge.category !== "physical") continue;
    add({ edge, fromId: edge.sourceId, toId: edge.targetId, reversed: false });
    if (direction === "either" && edge.sourceId !== edge.targetId) add({ edge, fromId: edge.targetId, toId: edge.sourceId, reversed: true });
  }
  const queue = [{ id: fromId, depth: 0 }];
  const predecessor = new Map<string, RecordedPathStep>();
  let truncated = false;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const node = queue[cursor];
    for (const step of adjacency.get(node.id) ?? []) {
      if (examined >= PATH_MAX_EXAMINATIONS) return result("work-limit");
      examined++;
      if (seen.has(step.toId)) continue;
      if (node.depth >= PATH_MAX_HOPS) { truncated = true; continue; }
      seen.add(step.toId); predecessor.set(step.toId, step);
      if (step.toId === toId) {
        const steps: RecordedPathStep[] = [];
        let current = toId;
        while (current !== fromId) {
          const previous = predecessor.get(current)!;
          steps.push(previous); current = previous.fromId;
        }
        return result("found", steps.reverse());
      }
      queue.push({ id: step.toId, depth: node.depth + 1 });
    }
  }
  return result(truncated ? "hop-limit" : "not-found");
}

export function newRecordedPath(fromId: string | null): RecordedPathState {
  return { fromId, toId: null, direction: "forward", kinds: "physical" };
}
const PARAMS = ["path", "path_from", "path_to", "path_direction", "path_kinds"] as const;
/** Unknown identifiers stay missing; malformed options never broaden a search. */
export function readRecordedPath(search: string, ids: ReadonlySet<string>): RecordedPathState | null {
  const params = new URLSearchParams(search);
  if (params.get("path") !== "recorded") return null;
  const valid = (key: string) => { const id = params.get(key); return id && ids.has(id) ? id : null; };
  return { fromId: valid("path_from"), toId: valid("path_to"),
    direction: params.get("path_direction") === "either" ? "either" : "forward",
    kinds: params.get("path_kinds") === "all" ? "all" : "physical" };
}
/** Own only path parameters; keep the pair inspector, search and unrelated URL state. */
export function recordedPathSearch(search: string, state: RecordedPathState | null): string {
  const params = new URLSearchParams(search);
  for (const key of PARAMS) params.delete(key);
  if (state) {
    params.set("path", "recorded");
    if (state.fromId) params.set("path_from", state.fromId);
    if (state.toId) params.set("path_to", state.toId);
    if (state.direction === "either") params.set("path_direction", "either");
    if (state.kinds === "all") params.set("path_kinds", "all");
  }
  return params.toString();
}
