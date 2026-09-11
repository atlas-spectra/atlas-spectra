import type { Evidence, ExplorerItem } from "./corpus";

export const CONNECTION_CATEGORIES = ["physical", "mathematical", "statistical", "numerical", "subjective", "epistemic"] as const;
export type ConnectionCategory = typeof CONNECTION_CATEGORIES[number];
interface EndpointReference { id: string; scope?: string }
export interface ConnectionRecord {
  id: string; name: string; sources?: ExplorerItem["sources"];
  relationships?: Array<{ id: string; type: string; category: string; description?: string;
    source_ref: EndpointReference; target_ref: EndpointReference; evidence?: Evidence }>;
}
export interface RecordedConnection {
  id: string; type: string; category: ConnectionCategory; description: string | null;
  sourceId: string; targetId: string; ownerId: string; ownerName: string;
  evidence: Evidence | null; sources: ExplorerItem["sources"];
}
export interface NodeConnection {
  id: string; ownerId: string; ownerName: string; sourceId: string; targetId: string;
}
export interface ConnectionCatalog { edges: RecordedConnection[]; nodeEdges: NodeConnection[] }
export interface ConnectionState { entityId: string | null; edgeId: string | null; category: ConnectionCategory | "all"; query: string }

const typeCategories = new Map<string, ConnectionCategory>();
const vocabulary: Record<ConnectionCategory, string[]> = {
  physical: ["GENERATES", "EMITS", "CONTAINS_MODE", "DETECTED_BY", "TRANSDUCES_TO", "FILTERED_BY", "COUPLES_TO", "RESONATES_WITH", "ENTRAINS", "PHASE_LOCKS_WITH", "MODULATES", "MIXES_WITH", "DIVIDED_TO", "MULTIPLIED_TO"],
  mathematical: ["HARMONIC_OF", "SUBHARMONIC_OF", "SHARES_SPECTRAL_BAND_WITH", "SHARES_DYNAMICAL_MODEL_WITH"],
  statistical: ["COHERENT_WITH", "CORRELATED_WITH"], numerical: ["SAME_NUMERICAL_FREQUENCY_AS"],
  subjective: ["SUBJECTIVELY_ASSOCIATED_WITH"], epistemic: ["HYPOTHESIZED_RELATION", "DISPUTED_RELATION", "REFUTED_RELATION"],
};
for (const category of CONNECTION_CATEGORIES) for (const type of vocabulary[category]) typeCategories.set(type, category);
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function unique<T extends { id: string }>(values: T[], label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    if (!value.id || result.has(value.id)) throw new Error(`Duplicate or blank ${label} ID: ${value.id}`);
    result.set(value.id, value);
  }
  return result;
}

/** Build-time projection of stored edges, not a frequency-matching or suggestion engine.
 * Local references never resolve against unrelated manifests. Non-phenomenon nodes
 * remain accounted for separately; their owner is NOT substituted as an endpoint.
 * Existing scientific validation resolves all graph nodes before this projection.
 */
export function buildRecordedConnections(records: ConnectionRecord[], items: ExplorerItem[]): ConnectionCatalog {
  const owners = unique(records, "record"), observations = unique(items, "observation");
  const seen = new Set<string>(), edges: RecordedConnection[] = [], nodeEdges: NodeConnection[] = [];
  for (const owner of [...records].sort((a, b) => compare(a.id, b.id))) {
    const sources = unique(owner.sources ?? [], "owner source");
    const endpoint = (ref: EndpointReference): string | null => {
      if (ref.scope !== undefined && ref.scope !== "atlas") throw new Error(`Unsupported endpoint scope: ${ref.scope}`);
      if (!ref.scope && ref.id !== owner.id) {
        if (owners.has(ref.id)) throw new Error(`Local reference cannot resolve another record: ${ref.id}`);
        return null;
      }
      if (!owners.has(ref.id)) return null; // A graph node, not a phenomenon root.
      if (!observations.has(ref.id)) throw new Error(`Missing observation for record: ${ref.id}`);
      return ref.id;
    };
    for (const edge of owner.relationships ?? []) {
      if (!edge.id || seen.has(edge.id)) throw new Error(`Duplicate or blank relationship ID: ${edge.id}`);
      seen.add(edge.id);
      const category = typeCategories.get(edge.type);
      if (!category || category !== edge.category) throw new Error(`Relationship type/category mismatch: ${edge.id}`);
      const resolved = (edge.evidence?.source_refs ?? []).map((ref) => {
        const source = sources.get(ref.id);
        if (!source) throw new Error(`Unresolved source ${ref.id} in owner ${owner.id} for ${edge.id}`);
        return source;
      });
      const sourceId = endpoint(edge.source_ref), targetId = endpoint(edge.target_ref);
      if (sourceId === null || targetId === null) {
        nodeEdges.push({ id: edge.id, ownerId: owner.id, ownerName: owner.name,
          sourceId: edge.source_ref.id, targetId: edge.target_ref.id });
        continue;
      }
      edges.push({ id: edge.id, type: edge.type, category, description: edge.description?.trim() || null,
        sourceId, targetId, ownerId: owner.id, ownerName: owner.name, evidence: edge.evidence ?? null, sources: resolved });
    }
  }
  edges.sort((a, b) => compare(a.id, b.id)); nodeEdges.sort((a, b) => compare(a.id, b.id));
  return { edges, nodeEdges };
}
export function connectionsFor(catalog: ConnectionCatalog, id: string | null, category: ConnectionState["category"] = "all") {
  return catalog.edges.filter((edge) => (edge.sourceId === id || edge.targetId === id) && (category === "all" || edge.category === category));
}
export const CONNECTION_MEANING: Record<ConnectionCategory, { label: string; caution: string }> = {
  physical: { label: "Physical relationship", caution: "This is a stored physical relationship, not one inferred from nearby frequencies. Its mechanism and review status are stated below." },
  mathematical: { label: "Mathematical relationship", caution: "A mathematical or spectral relationship does not by itself establish physical coupling." },
  statistical: { label: "Statistical association", caution: "Association is not causation. The original evidence—not these coordinates—determines what was established." },
  numerical: { label: "Numerical coincidence", caution: "A matching number is not evidence of a shared physical mechanism. Read exactly which value or boundary is being compared." },
  subjective: { label: "Subjective association", caution: "This records an association, not a measured physical connection or a demonstrated mechanism." },
  epistemic: { label: "Hypothesis or disputed claim", caution: "This is an explicitly qualified claim, not an established physical process. Its original type and evidence remain visible." },
};

/** Invalid or foreign edge IDs never select a different pair under the requested name. */
export function readConnectionState(search: string, catalog: ConnectionCatalog, items: ExplorerItem[]): ConnectionState {
  const params = new URLSearchParams(search), ids = new Set(items.map((item) => item.id));
  const requestedEdge = catalog.edges.find((edge) => edge.id === params.get("edge"));
  const requestedEntity = params.get("entity");
  const entityId = requestedEntity && ids.has(requestedEntity) ? requestedEntity
    : requestedEdge?.sourceId ?? (ids.has("biology.heart.resting-adult-rate") ? "biology.heart.resting-adult-rate" : items[0]?.id ?? null);
  const rawCategory = params.get("kind");
  const category = CONNECTION_CATEGORIES.find((value) => value === rawCategory) ?? "all";
  const edgeId = requestedEdge && connectionsFor(catalog, entityId, category).some((edge) => edge.id === requestedEdge.id) ? requestedEdge.id : null;
  return { entityId, edgeId, category, query: (params.get("q") ?? "").slice(0, 1000) };
}
export function connectionSearch(search: string, state: ConnectionState): string {
  const params = new URLSearchParams(search);
  state.entityId ? params.set("entity", state.entityId) : params.delete("entity");
  state.edgeId ? params.set("edge", state.edgeId) : params.delete("edge");
  state.category !== "all" ? params.set("kind", state.category) : params.delete("kind");
  state.query ? params.set("q", state.query) : params.delete("q");
  return params.toString();
}
