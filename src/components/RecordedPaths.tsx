import { useEffect, useMemo, useRef, useState } from "react";
import type { ExplorerItem } from "../lib/corpus";
import { identityFor } from "../lib/phenomenon-identity";
import { CONNECTION_MEANING, connectionSearch, type ConnectionCatalog } from "../lib/recorded-connections";
import { findRecordedPath, newRecordedPath, readRecordedPath, recordedPathSearch, PATH_MAX_HOPS,
  PATH_MAX_NODES, PATH_MAX_EDGES, PATH_MAX_EXAMINATIONS, type RecordedPathState, type RecordedPathStep } from "../lib/recorded-paths";
import { PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import "../styles/recorded-paths.css";

const readable = (value: string | undefined, fallback = "unspecified") => (value ?? fallback).replaceAll("_", " ");

/** Path endpoints stay independent of the single-link inspector's browsing perspective. */
export default function RecordedPaths({ items, catalog, base, startingId, inspectedEdgeId, onInspect }: {
  items: ExplorerItem[]; catalog: ConnectionCatalog; base: string; startingId: string | null;
  inspectedEdgeId: string | null; onInspect: (step: RecordedPathStep) => void;
}) {
  const ids = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const [state, setState] = useState<RecordedPathState | null>(null);
  const [ready, setReady] = useState(false);
  const focusAfterChange = useRef<"heading" | "trigger" | null>(null);
  useEffect(() => {
    const restore = () => { setState(readRecordedPath(location.search, ids)); setReady(true); };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [ids]);
  useEffect(() => {
    const focus = focusAfterChange.current;
    if (!focus) return;
    document.getElementById(focus === "heading" ? "recorded-path-heading" : "recorded-path-trigger")?.focus({ preventScroll: true });
    focusAfterChange.current = null;
  }, [state]);
  const result = useMemo(() => state ? findRecordedPath(catalog, ids, state) : null, [catalog, ids, state]);
  function change(next: RecordedPathState | null) {
    if (!ready) return;
    const safe = readRecordedPath(recordedPathSearch("", next), ids);
    if (recordedPathSearch("", safe) === recordedPathSearch("", state)) return;
    const url = new URL(location.href); url.search = recordedPathSearch(url.search, safe);
    history.pushState({ ...history.state }, "", `${url.pathname}${url.search}${url.hash}`);
    setState(safe);
  }
  if (!state || !result) return <div className="recorded-path-entry">
    <button id="recorded-path-trigger" type="button" disabled={!ready} onClick={() => {
      focusAfterChange.current = "heading"; change(newRecordedPath(startingId));
    }}>Find a recorded path</button><p>Choose two observations. See which stored links connect them.</p>
  </div>;

  const from = state.fromId ? byId.get(state.fromId) : undefined;
  const to = state.toId ? byId.get(state.toId) : undefined;
  const nonphysical = result.steps.filter((step) => step.edge.category !== "physical").length;
  const reversed = result.steps.filter((step) => step.reversed).length;
  const summary = result.status === "found" ? `One shortest recorded path · ${result.steps.length} ${result.steps.length === 1 ? "link" : "links"}`
    : result.status === "same" ? "Same observation selected. No connecting link is required or inferred."
    : result.status === "invalid" ? "Choose two valid observations to search."
    : result.status === "hop-limit" ? `No path found within ${PATH_MAX_HOPS} links. Longer routes were not searched.`
    : result.status === "work-limit" ? "Search work limit reached. The search is incomplete; this is not a no-path result."
    : result.status === "graph-limit" ? "This catalog exceeds the interactive path-search limit. Use the single-link browser below."
    : result.status === "invalid-graph" ? "The recorded graph is inconsistent. No path is displayed."
    : "No path found with these settings in the recorded record-level graph.";
  return <section className="recorded-path-panel" aria-label="Find a recorded path" data-path-status={result.status}
    data-path-from={state.fromId ?? ""} data-path-to={state.toId ?? ""}>
    <header><div><span className="connections-eyebrow">FOLLOW THE RECORDED LINKS</span><h2 id="recorded-path-heading" tabIndex={-1}>How do these connect?</h2></div>
      <button type="button" className="recorded-path-close" onClick={() => { focusAfterChange.current = "trigger"; change(null); }}>Close path finder</button></header>
    <div className="recorded-path-controls">
      <label>From<select aria-label="Path start observation" value={state.fromId ?? ""} onChange={(event) => change({ ...state, fromId: event.target.value || null })}>
        <option value="">Choose an observation</option>{items.map((item) => <option key={item.id} value={item.id}>{identityFor(item).title}</option>)}
      </select></label>
      <label>To<select aria-label="Path destination observation" value={state.toId ?? ""} onChange={(event) => change({ ...state, toId: event.target.value || null })}>
        <option value="">Choose an observation</option>{items.map((item) => <option key={item.id} value={item.id}>{identityFor(item).title}</option>)}
      </select></label>
      <label>Direction<select aria-label="Path traversal direction" value={state.direction} onChange={(event) => change({ ...state, direction: event.target.value === "either" ? "either" : "forward" })}>
        <option value="forward">Follow stored direction</option><option value="either">Allow either direction</option>
      </select></label>
      <label>Link categories<select aria-label="Path link categories" value={state.kinds} onChange={(event) => change({ ...state, kinds: event.target.value === "all" ? "all" : "physical" })}>
        <option value="physical">Physical links only</option><option value="all">All recorded categories</option>
      </select></label>
    </div>
    <p className="recorded-path-settings-note">Path settings are separate from the single-link browser's category filter. Failed searches never silently broaden them.</p>
    <p className="recorded-path-status" role="status" aria-live="polite" aria-atomic="true">{summary}{from && to ? ` From ${identityFor(from).title} to ${identityFor(to).title}.` : ""}</p>
    {(result.status === "not-found" || result.status === "hop-limit") && <p className="recorded-path-caution">This only describes the stored graph and chosen settings, not proof that the observations are physically unrelated. You may explicitly change the direction or categories above.</p>}
    {result.status === "found" && <>
      <p className="recorded-path-caution" role="note">A path is a sequence of recorded links, not a new end-to-end physical claim. Even physical-category links do not prove transitive causation, identical signals or compatible conditions.</p>
      {(nonphysical > 0 || reversed > 0) && <div className="recorded-path-warning" role="note">
        {nonphysical > 0 && <p><strong>{nonphysical} nonphysical {nonphysical === 1 ? "link" : "links"}.</strong> This path includes a coincidence, association or qualified claim; it is not a physical signal journey.</p>}
        {reversed > 0 && <p><strong>{reversed} reverse {reversed === 1 ? "traversal" : "traversals"}.</strong> Browsing a stored link backwards does not establish reverse signal flow.</p>}
      </div>}
      <ol className="recorded-path-steps" aria-label="Recorded path links">{result.steps.map((step, i) => {
        const a = byId.get(step.fromId)!, b = byId.get(step.toId)!;
        const edge = step.edge;
        const href = `${base}connections/?${connectionSearch(recordedPathSearch(ready ? location.search : "", state),
          { entityId: step.fromId, edgeId: edge.id, category: "all", query: "" })}#connections-selected-detail`;
        return <li key={edge.id} data-path-edge={edge.id} data-reversed={step.reversed} data-path-category={edge.category}>
          <div className="recorded-path-step-heading"><span className="recorded-path-number">{i + 1}</span>
            <div className="recorded-path-subject"><PhenomenonIcon item={a} /><span><strong>{identityFor(a).title}</strong><small>{a.display ? phenomenonValue(a) : "No frequency assigned"}{a.display?.mode === "claim-reference" ? " · claim reference" : a.profileType === "event_rate" ? " · event rate" : ""}</small></span></div>
            <span className="recorded-path-arrow" aria-label="then">→</span>
            <div className="recorded-path-subject"><PhenomenonIcon item={b} /><span><strong>{identityFor(b).title}</strong><small>{b.display ? phenomenonValue(b) : "No frequency assigned"}{b.display?.mode === "claim-reference" ? " · claim reference" : b.profileType === "event_rate" ? " · event rate" : ""}</small></span></div>
          </div>
          <div className="recorded-path-link-info"><div><strong>{CONNECTION_MEANING[edge.category].label}</strong><span>{readable(edge.type).toLowerCase()}</span>
            <small>Mechanism: {readable(edge.evidence?.mechanism_status)} · Review: {readable(edge.evidence?.review_status, "unreviewed")}</small></div>
            <a href={href} aria-label={`Inspect path link ${i + 1} and evidence`} aria-current={inspectedEdgeId === edge.id ? "true" : undefined} onClick={(event) => {
              if (!ready || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
              event.preventDefault(); onInspect(step);
            }}>Inspect link & evidence ↗</a></div>
          <p className={`recorded-path-direction${step.reversed ? " is-reversed" : ""}`}>Stored direction: {identityFor(byId.get(edge.sourceId)!).title} → {identityFor(byId.get(edge.targetId)!).title}. {step.reversed ? "Traversed in reverse — not reverse signal flow." : "Following stored direction."}</p>
        </li>;
      })}</ol>
      <p className="recorded-path-settings-note">Inspecting a link below keeps these path endpoints fixed. Each step retains its own sources and evidence; this path has no combined confidence score.</p>
    </>}
    <details className="recorded-path-method"><summary>How this path is found</summary>
      <p>Breadth-first search returns one shortest path by number of links, not the strongest scientific explanation. Equal-length alternatives use stable relationship-ID order. Other paths may exist.</p>
      <p>Only stored record-level edges are searched. Frequencies, visual proximity and parent-node substitutions never add a step. {catalog.nodeEdges.length} node-level relationships remain outside this search.</p>
      <p>Limits: {PATH_MAX_HOPS} links; {PATH_MAX_NODES.toLocaleString("en-US")} observations; {PATH_MAX_EDGES.toLocaleString("en-US")} indexed edges; {PATH_MAX_EXAMINATIONS.toLocaleString("en-US")} examined adjacency entries. This search visited {result.visited} observations and examined {result.examined} entries.</p>
      <p>Current quantities may describe different conditions or reference populations. Read each original relationship and observation before interpreting a path.</p>
    </details>
  </section>;
}
