import type { Evidence, ExplorerItem } from "./corpus";
import { extentOf } from "./atlas-view";

export interface ProcessFacet {
  recordId: string;
  title: string;
  description: string;
  evidenceTarget: string;
}
export interface ProcessGroup {
  id: string;
  title: string;
  summary: string;
  anchorId: string;
  anchorLabel: string;
  rationale: string;
  facets: readonly ProcessFacet[];
}

/** Curated process membership, NEVER inferred from proximity, equal rates, or lane. */
export const PROCESS_GROUPS: readonly ProcessGroup[] = [{
  id: "heart-activity",
  title: "Heart activity",
  summary: "One cardiac process, observed as beat counts, electrical activations, and arterial pulse arrivals.",
  anchorId: "biology.heart.resting-adult-rate",
  anchorLabel: "Heartbeat reference",
  rationale: "The cardiac-cycle count supplies the resting-rate reference. Ventricular activation and arterial pulse arrival are associated observations; their manifests explicitly derive their rate ranges from that reference. This is not three independent measurements or a claim that the signals are identical.",
  facets: [
    { recordId: "biology.heart.resting-adult-rate", title: "Heartbeat count", description: "How often the cardiac cycle repeats.", evidenceTarget: "/frequency_profile/rate" },
    { recordId: "cardiology.ventricular-activation.resting-adult", title: "Electrical activation", description: "Ventricular electrical events associated with pumping—not the full electrical spectrum.", evidenceTarget: "/frequency_profile/rate" },
    { recordId: "cardiology.arterial-pulse.resting-adult", title: "Arterial pulse", description: "Pressure-pulse arrivals downstream, not a measurement of the entire pressure waveform.", evidenceTarget: "/frequency_profile/rate" },
  ],
}];

export function groupForRecord(id: string | null): ProcessGroup | undefined {
  return id ? PROCESS_GROUPS.find((group) => group.facets.some((facet) => facet.recordId === id)) : undefined;
}
export function groupForAnchor(id: string): ProcessGroup | undefined {
  return PROCESS_GROUPS.find((group) => group.anchorId === id);
}
export function facetEvidence(item: ExplorerItem, target: string): Evidence | undefined {
  // Prefer the precise field, then its nearest ancestor. Never borrow a sibling's evidence.
  return item.provenance.filter((entry) => target === entry.target || target.startsWith(`${entry.target}/`))
    .sort((a, b) => b.target.length - a.target.length)[0]?.evidence;
}
export function groupMembers(group: ProcessGroup, items: ExplorerItem[]): ExplorerItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return group.facets.flatMap((facet) => { const item = byId.get(facet.recordId); return item ? [item] : []; });
}

/** All returned entries are ORIGINAL records. A group uses only its labeled anchor's coordinate. */
export function projectDiscovery(items: ExplorerItem[], selectedId: string | null = null, detailed = false) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const hidden = new Set<string>();
  const collapsed = new Map<string, ProcessGroup>();
  if (!detailed) for (const group of PROCESS_GROUPS) {
    // Partial filters/partial corpora stay literal: never hide a match or invent an anchor.
    if (!group.facets.every((facet) => byId.has(facet.recordId))) continue;
    if (group.facets.some((facet) => facet.recordId === selectedId)) continue;
    const anchor = byId.get(group.anchorId);
    if (!anchor || !extentOf(anchor)) continue;
    collapsed.set(anchor.id, group);
    for (const facet of group.facets) if (facet.recordId !== anchor.id) hidden.add(facet.recordId);
  }
  return { items: items.filter((item) => !hidden.has(item.id)), collapsed };
}

/** Run at build time, so registry edits cannot silently orphan or duplicate a record. */
export function validateProcessGroups(items: ExplorerItem[]): void {
  const ids = new Set(items.map((item) => item.id)), groups = new Set<string>(), members = new Set<string>();
  for (const group of PROCESS_GROUPS) {
    if (groups.has(group.id)) throw new Error(`Duplicate process group: ${group.id}`);
    groups.add(group.id);
    if (!group.facets.some((facet) => facet.recordId === group.anchorId)) throw new Error(`Group anchor is not a member: ${group.id}`);
    for (const facet of group.facets) {
      if (!ids.has(facet.recordId)) throw new Error(`Unknown process member: ${facet.recordId}`);
      if (members.has(facet.recordId)) throw new Error(`Duplicate process membership: ${facet.recordId}`);
      members.add(facet.recordId);
    }
  }
}
