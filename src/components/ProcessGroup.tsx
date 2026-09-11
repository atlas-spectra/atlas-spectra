import type { ExplorerItem } from "../lib/corpus";
import { facetEvidence, groupMembers, type ProcessGroup } from "../lib/process-groups";
import { PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import "../styles/process-groups.css";

/** The card's number and physical mark belong to the named anchor, not an aggregate. */
export function ProcessGroupFace({ group, anchor }: { group: ProcessGroup; anchor: ExplorerItem }) {
  return <span className="phenomenon-face process-group-face" data-process-id={group.id}>
    <PhenomenonIcon item={anchor} />
    <span className="phenomenon-copy">
      <strong className="phenomenon-title">{group.title}</strong>
      <span className="phenomenon-subtitle">{group.anchorLabel}</span>
      <span className="phenomenon-value">{phenomenonValue(anchor)}</span>
      <span className="process-disclosure">Explore {group.facets.length} observations <span aria-hidden="true">↗</span></span>
    </span>
  </span>;
}

export function ProcessGroupPanel({ group, items, selectedId, onSelect, onCollapse }: {
  group: ProcessGroup; items: ExplorerItem[]; selectedId: string | null;
  onSelect: (id: string) => void; onCollapse: () => void;
}) {
  const members = groupMembers(group, items), anchor = members.find((item) => item.id === group.anchorId);
  if (!anchor) return null;
  return <section className="process-panel" id={`process-${group.id}`} aria-label={`${group.title} observations`}>
    <div className="process-panel-heading"><PhenomenonIcon item={anchor} />
      <div><span>ONE PROCESS · {members.length} OBSERVATIONS</span><h2>{group.title}</h2><p>{group.summary}</p></div>
      <button type="button" onClick={onCollapse}>Collapse observations</button>
    </div>
    <div className="process-reference"><span>Resting-adult heartbeat reference</span><strong>{phenomenonValue(anchor)}</strong><small>The overview mark belongs to this reference—not a combined measurement.</small></div>
    <div className="process-facets">{group.facets.map((facet) => {
      const item = members.find((member) => member.id === facet.recordId);
      if (!item) return null;
      const evidence = facetEvidence(item, facet.evidenceTarget);
      const basis = evidence?.basis?.replaceAll("_", " ") ?? "unspecified evidence";
      return <button type="button" key={facet.recordId} data-facet-id={facet.recordId} aria-pressed={selectedId === facet.recordId} onClick={() => onSelect(facet.recordId)}>
        <PhenomenonIcon item={item} /><span className="process-facet-copy"><strong>{facet.title}</strong><span>{facet.description}</span>
          <span className="process-facet-value">{phenomenonValue(item)} <small>Event rate</small></span>
          <span className="process-facet-basis" data-basis={evidence?.basis ?? "unspecified"}>{basis} · {evidence?.review_status?.replaceAll("_", " ") ?? "unreviewed"}</span>
          <span className="process-inspect">Inspect this observation <span aria-hidden="true">→</span></span>
        </span>
      </button>;
    })}</div>
    <details className="process-explanation"><summary>Why do these have the same numbers?</summary><p>{group.rationale}</p><p>The detailed records retain their own sources and derivations. The list is not a timing diagram, and its order does not describe propagation delays.</p></details>
  </section>;
}
