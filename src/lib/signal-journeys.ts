import type { Evidence, ExplorerItem } from "./corpus";
import { extentOf } from "./atlas-view";

export interface JourneyDefinition {
  id: string; title: string; summary: string;
  steps: Array<{ recordId: string; label: string }>;
  edgeIds: string[];
}
export interface JourneyDocument { version: "0.1.0"; journeys: JourneyDefinition[] }
export interface JourneyRecord {
  id: string;
  name: string;
  system?: { name?: string };
  observable?: { name?: string };
  sources?: ExplorerItem["sources"];
  relationships?: Array<{
    id: string; type: string; category: string; description?: string;
    source_ref: { id: string; scope?: string };
    target_ref: { id: string; scope?: string };
    evidence?: Evidence;
  }>;
}
export interface JourneyStep { label: string; item: ExplorerItem; system: string; observable: string }
export interface JourneyHop {
  id: string; type: string; category: string; description: string;
  sourceId: string; targetId: string; ownerId: string; ownerName: string;
  evidence: Evidence; sources: ExplorerItem["sources"];
}
export interface SignalJourney {
  id: string; title: string; summary: string; steps: JourneyStep[]; hops: JourneyHop[];
}
export interface JourneyState { journey: string; stage: string }

function object(value: unknown, keys: string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected object`);
  const result = value as Record<string, unknown>;
  if (keys.some((key) => !Object.hasOwn(result, key)) || Object.keys(result).some((key) => !keys.includes(key))) {
    throw new Error(`${path}: unexpected or missing field`);
  }
  return result;
}
function text(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${path}: expected nonblank text`);
}
function array(value: unknown, min: number, max: number, path: string): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${path}: invalid array length`);
}
/** Mirrors journey.schema.json at the build boundary; CI independently checks the JSON Schema. */
export function parseJourneyDocument(value: unknown): JourneyDocument {
  const root = object(value, ["version", "journeys"], "journeys");
  if (root.version !== "0.1.0") throw new Error("Unsupported journey version");
  array(root.journeys, 1, 24, "journeys");
  const ids = new Set<string>();
  for (const raw of root.journeys) {
    const entry = object(raw, ["id", "title", "summary", "steps", "edgeIds"], "journey");
    text(entry.id, "journey.id"); text(entry.title, "journey.title"); text(entry.summary, "journey.summary");
    if (!/^[a-z][a-z0-9-]*$/.test(entry.id) || ids.has(entry.id)) throw new Error("Invalid or duplicate journey ID");
    ids.add(entry.id);
    array(entry.steps, 2, 12, `${entry.id}.steps`); array(entry.edgeIds, 1, 11, `${entry.id}.edgeIds`);
    if (entry.edgeIds.length !== entry.steps.length - 1) throw new Error(`${entry.id}: one edge required between each pair of stages`);
    const steps = new Set<string>(), edges = new Set<string>();
    for (const rawStep of entry.steps) {
      const step = object(rawStep, ["recordId", "label"], "stage");
      text(step.recordId, "stage.recordId"); text(step.label, "stage.label");
      if (steps.has(step.recordId)) throw new Error(`${entry.id}: duplicate stage`);
      steps.add(step.recordId);
    }
    for (const edge of entry.edgeIds) {
      text(edge, "edgeId");
      if (edges.has(edge)) throw new Error(`${entry.id}: duplicate edge`);
      edges.add(edge);
    }
  }
  return value as JourneyDocument;
}
function byId<T extends { id: string }>(values: T[]): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    if (result.has(value.id)) throw new Error(`Duplicate scientific ID: ${value.id}`);
    result.set(value.id, value);
  }
  return result;
}
/** Resolve exact directed edges and their OWNER'S source namespace. No proximity-based inference. */
export function buildJourneys(value: unknown, records: JourneyRecord[], items: ExplorerItem[]): SignalJourney[] {
  const document = parseJourneyDocument(value), recordsById = byId(records), itemsById = byId(items);
  const edges = new Map<string, { owner: JourneyRecord; edge: NonNullable<JourneyRecord["relationships"]>[number] }>();
  for (const owner of records) for (const edge of owner.relationships ?? []) {
    if (edges.has(edge.id)) throw new Error(`Duplicate scientific edge: ${edge.id}`);
    edges.set(edge.id, { owner, edge });
  }
  return document.journeys.map((definition) => {
    const steps = definition.steps.map(({ recordId, label }) => {
      const record = recordsById.get(recordId), item = itemsById.get(recordId);
      if (!record || !item) throw new Error(`${definition.id}: missing record ${recordId}`);
      return { label, item, system: record.system?.name ?? "System unspecified", observable: record.observable?.name ?? "Observable unspecified" };
    });
    const hops = definition.edgeIds.map((id, index) => {
      const found = edges.get(id);
      if (!found) throw new Error(`${definition.id}: missing edge ${id}`);
      const { edge, owner } = found;
      if (edge.source_ref.id !== steps[index].item.id || edge.target_ref.id !== steps[index + 1].item.id) {
        throw new Error(`${id}: edge endpoints or direction do not match the journey`);
      }
      if ([edge.source_ref, edge.target_ref].some((ref) => ref.scope && ref.scope !== "atlas")) throw new Error(`${id}: non-atlas endpoint`);
      if (edge.category !== "physical") throw new Error(`${id}: nonphysical edge cannot be a signal-process hop`);
      const evidence = edge.evidence;
      if (!edge.description?.trim() || !evidence?.source_refs?.length) throw new Error(`${id}: missing description or source evidence`);
      const ownerSources = byId(owner.sources ?? []);
      const sources = evidence.source_refs.map((ref) => {
        const source = ownerSources.get(ref.id);
        if (!source) throw new Error(`${id}: unresolved owner source ${ref.id}`);
        return source;
      });
      return { id, type: edge.type, category: edge.category, description: edge.description,
        sourceId: edge.source_ref.id, targetId: edge.target_ref.id, ownerId: owner.id, ownerName: owner.name, evidence, sources };
    });
    return { id: definition.id, title: definition.title, summary: definition.summary, steps, hops };
  });
}
export function readJourneyState(search: string, journeys: SignalJourney[]): JourneyState {
  if (!journeys.length) throw new Error("At least one journey is required");
  const params = new URLSearchParams(search);
  const journey = journeys.find((entry) => entry.id === params.get("journey")) ?? journeys[0];
  const stage = journey.steps.find((entry) => entry.item.id === params.get("stage")) ?? journey.steps[0];
  return { journey: journey.id, stage: stage.item.id };
}
export function journeyRecordLink(item: ExplorerItem, base: string, mode: "explore" | "flight"): string {
  const params = new URLSearchParams({ entity: item.id }), extent = extentOf(item);
  if (extent) {
    // A discrete spectrum gets an actual line, never a made-up midpoint in a gap.
    const at = extent.lines[0] ?? (extent.low + extent.high) / 2;
    params.set(mode === "explore" ? "center" : "at", String(at));
    if (mode === "explore") params.set("span", String(Math.max(1.2, extent.high - extent.low + 1)));
  }
  return `${base}${mode}/?${params}`;
}
export function safeSourceUrl(value: string | undefined): string | undefined {
  try { const url = new URL(value ?? ""); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
