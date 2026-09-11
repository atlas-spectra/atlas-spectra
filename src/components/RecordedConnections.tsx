import { useEffect, useMemo, useState } from "react";
import type { ExplorerItem } from "../lib/corpus";
import { buildFlightModel, formatFlightHz, type FlightModel } from "../lib/flight";
import { connectionPlacement, flightOverviewX, type ConnectionPlacement } from "../lib/flight-connection";
import { eventRateReading } from "../lib/flight-presentation";
import { identityFor, identitySearchText } from "../lib/phenomenon-identity";
import { groupForRecord } from "../lib/process-groups";
import { journeyRecordLink, safeSourceUrl } from "../lib/signal-journeys";
import { CONNECTION_CATEGORIES, CONNECTION_MEANING, connectionsFor, connectionSearch, readConnectionState,
  type ConnectionCatalog, type ConnectionState, type RecordedConnection } from "../lib/recorded-connections";
import { PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import FlightEvidence from "./FlightEvidence";
import RecordedPaths from "./RecordedPaths";
import "../styles/recorded-connections.css";

const readable = (value: string | null | undefined, fallback = "unspecified") => (value ?? fallback).replaceAll("_", " ");
const placementCopy: Record<ConnectionPlacement, string> = {
  unpositioned: "A missing coordinate stays missing. The relationship can be recorded without assigning a frequency to both observations.",
  "same-extent": "The displayed extents match. These remain distinct observations, not automatically identical signals or independent measurements.",
  overlap: "The displayed coordinates overlap. Read the relationship's explanation: it may compare just a boundary, not the entire range.",
  lower: "B is lower on the common scale than A. This comparison describes coordinates, not causation, elapsed time or distance.",
  higher: "B is higher on the common scale than A. This comparison describes coordinates, not causation, elapsed time or distance.",
  "separate-lines": "The outer spans overlap, but the actual positions do not. Gaps between spectral lines are not filled with invented data.",
};

function PairScale({ source, target, model }: { source: ExplorerItem; target: ExplorerItem; model: FlightModel }) {
  const a = model.records.find((record) => record.id === source.id) ?? null;
  const b = model.records.find((record) => record.id === target.id) ?? null;
  const placement = connectionPlacement(a, b), x = (value: number) => flightOverviewX(value, model.bounds);
  return <section className="connections-scale" aria-label="Compare original display coordinates" data-placement={placement}>
    <h3>On the same scale</h3><p>Each row uses the whole-atlas logarithmic scale. Only horizontal position represents a coordinate.</p>
    {[{ item: source, record: a, role: "source", letter: "A" }, { item: target, record: b, role: "target", letter: "B" }].map(({ item, record, role, letter }) =>
      <div className="connections-scale-row" key={role} data-pair-role={role} data-pair-record={item.id}>
        <div><strong>{letter} · {identityFor(item).title}</strong><span>{record ? item.display?.mode === "claim-reference" ? "Claim reference" : item.profileType === "event_rate" ? "Event rate" : "Frequency coordinate" : "No frequency assigned"}</span></div>
        <svg viewBox="0 0 1000 28" preserveAspectRatio="none" aria-hidden="true">
          <line x1="10" x2="990" y1="14" y2="14" className="connections-scale-track" />
          {record && <g className={`connections-scale-mark is-${role}${item.display?.mode === "claim-reference" ? " is-reference" : ""}`}>
            {record.lines.length ? record.lines.map((line) => <line key={line} data-pair-mark data-log={line} x1={x(line)} x2={x(line)} y1="5" y2="23" />)
              : record.low === record.high ? <line data-pair-mark data-log={record.low} x1={x(record.low)} x2={x(record.low)} y1="5" y2="23" />
              : <rect data-pair-mark data-log-low={record.low} data-log-high={record.high} x={x(record.low)} y="9" width={x(record.high) - x(record.low)} height="10" rx="2" />}
          </g>}
        </svg>
      </div>)}
    <div className="connections-scale-ends"><span>{formatFlightHz(model.bounds.min)} equivalent</span><span>{formatFlightHz(model.bounds.max)} equivalent</span></div>
    <p className="connections-scale-note">{placementCopy[placement]}</p>
    <p className="connections-scale-note">Marks show the original record extents or listed lines, not necessarily the exact subset mentioned by this relationship. The explanation below defines that scope.</p>
  </section>;
}

function Endpoint({ item, letter, base, onContinue }: { item: ExplorerItem; letter: string; base: string; onContinue: () => void }) {
  const rate = eventRateReading(item);
  return <article className="connections-endpoint" data-endpoint-id={item.id}>
    <span className="connections-eyebrow">{letter} · {letter === "A" ? "STORED SOURCE" : "STORED TARGET"}</span>
    <div className="connections-identity"><PhenomenonIcon item={item} /><h3>{identityFor(item).title}</h3></div>
    <p className="connections-observable">{identityFor(item).subtitle}</p>
    <strong className="connections-value">{item.display ? phenomenonValue(item) : "No frequency assigned"}</strong>
    <p className="connections-quantity-kind">{item.display?.mode === "claim-reference" ? "Claim reference · not a measured physical spectrum" : item.profileType === "event_rate" ? "Event rate · not a single-frequency waveform" : item.display ? "Original observation · frequency coordinate" : "Unpositioned · not assigned its peer's frequency"}</p>
    {rate && <p className="connections-conversion">Common scale: {rate}</p>}
    <div className="connections-endpoint-actions"><button type="button" onClick={onContinue}>Continue from {identityFor(item).title} →</button>
      <a href={journeyRecordLink(item, base, "explore")}>Atlas ↗</a><a href={journeyRecordLink(item, base, "flight")}>Flight ↗</a></div>
    <details className="connections-observation-evidence" key={item.id}><summary>This observation & its evidence</summary>
      <p>{item.name}</p><p>{item.summary}</p><p>Original value: {item.display?.nativeLabel ?? "Unresolved"}</p>
      <p>{item.display?.note ?? "No supported frequency coordinate is assigned to this record."}</p>
      <FlightEvidence item={item} connectionsLink={false} />
      <a href={`${base}phenomena/${encodeURIComponent(item.id)}/`}>Full observation record ↗</a>
    </details>
  </article>;
}
function RelationshipEvidence({ edge, base }: { edge: RecordedConnection; base: string }) {
  return <section className="connections-evidence" aria-label="Evidence for the selected relationship" data-owner-id={edge.ownerId}>
    <h3>Why is this link recorded?</h3>
    <p className="connections-explanation">{edge.description ?? "No explanation is recorded for this relationship."}</p>
    <dl><div><dt>Evidence basis</dt><dd>{readable(edge.evidence?.basis)}</dd></div>
      <div><dt>Review status</dt><dd>{readable(edge.evidence?.review_status, "unreviewed")}</dd></div>
      <div><dt>Mechanism status</dt><dd>{readable(edge.evidence?.mechanism_status)}</dd></div></dl>
    {!edge.evidence && <p>No evidence object is attached to this relationship. Endpoint evidence is not substituted.</p>}
    {edge.evidence?.derivation && <div className="connections-derivation"><h4>Recorded derivation</h4><p>{edge.evidence.derivation}</p></div>}
    {edge.evidence?.locator && <p>Source location: {edge.evidence.locator}</p>}
    <div className="connections-sources"><h4>Sources for this relationship</h4>{edge.sources.length ? edge.sources.map((source) => {
      const url = safeSourceUrl(source.url);
      return <p key={source.id} data-source-id={source.id}>{url ? <a href={url}>{source.title} ↗</a> : source.title}{source.publisher && <small>{source.publisher}</small>}</p>;
    }) : <p>No source references are attached to this relationship.</p>}</div>
    <details className="connections-provenance"><summary>Exact relationship & source ownership</summary>
      <p>Relationship ID: <code>{edge.id}</code></p><p>Stored direction: <code>{edge.sourceId}</code> → <code>{edge.targetId}</code></p>
      <p>Owner: <a href={`${base}phenomena/${encodeURIComponent(edge.ownerId)}/`}>{edge.ownerName}</a>.</p>
      <p>These sources are resolved only within the owning record. Evidence for either observation's quantity is shown separately in its card.</p>
    </details>
  </section>;
}

export default function RecordedConnections({ items, catalog, base }: { items: ExplorerItem[]; catalog: ConnectionCatalog; base: string }) {
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const model = useMemo(() => buildFlightModel(items, [...new Set(items.map((item) => item.lane))]), [items]);
  const [state, setState] = useState(() => readConnectionState("", catalog, items));
  const [ready, setReady] = useState(false);
  const [inspectionRequest, setInspectionRequest] = useState(0);
  const selected = state.entityId ? byId.get(state.entityId) : undefined;
  const edges = connectionsFor(catalog, state.entityId, state.category);
  const allEdges = connectionsFor(catalog, state.entityId);
  const edge = edges.find((candidate) => candidate.id === state.edgeId);
  const source = edge ? byId.get(edge.sourceId) : undefined, target = edge ? byId.get(edge.targetId) : undefined;
  const query = state.query.trim().toLowerCase();
  const matching = items.filter((item) => [item.name, item.id, item.summary, item.lane, ...item.domains, identitySearchText(item), groupForRecord(item.id)?.title ?? ""].some((value) => value.toLowerCase().includes(query)));
  function save(next: ConnectionState, method: "replaceState" | "pushState") {
    const url = new URL(location.href); url.search = connectionSearch(url.search, next);
    history[method]({ ...history.state }, "", `${url.pathname}${url.search}${url.hash}`);
  }
  useEffect(() => {
    const restore = () => { const next = readConnectionState(location.search, catalog, items); setState(next); setReady(true); save(next, "replaceState"); };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [items, catalog]);
  useEffect(() => {
    if (!inspectionRequest) return;
    // Run only after an explicit path inspection, once the NEW pair and link list
    // have committed. Focusing a tall container alone can hide its heading.
    const detail = document.getElementById("connections-selected-detail");
    if (!detail) return;
    detail.focus({ preventScroll: true });
    const headerBottom = Math.max(0, document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0);
    const top = window.scrollY + detail.getBoundingClientRect().top - headerBottom - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    // A repeated inspection still reveals the pair without creating history;
    // initial hydration and native back/forward do not request focus or scrolling.
  }, [inspectionRequest]);
  function visit(next: ConnectionState, replace = false) {
    if (!ready) return;
    const safe = readConnectionState(connectionSearch("", next), catalog, items);
    if (connectionSearch("", safe) === connectionSearch("", state)) return;
    setState(safe); save(safe, replace ? "replaceState" : "pushState");
  }
  function start(id: string, keepEdge: string | null = null, recoverFocus = false) {
    visit({ entityId: id, edgeId: keepEdge, category: "all", query: "" });
    // The search result unmounts when its query clears; return to a stable control.
    if (recoverFocus) document.getElementById("connections-record")?.focus({ preventScroll: true });
  }
  function continueFrom(id: string, edgeId: string) {
    const changed = state.entityId !== id || state.category !== "all" || state.query !== "";
    start(id, edgeId);
    // Bring the newly relevant links back into view, especially above the mobile pair.
    // Focus is discrete, not a camera animation; repeated current actions remain no-ops.
    if (changed) document.getElementById("connections-record")?.focus();
  }
  return <div className="connections-app" data-ready={ready} data-entity-id={state.entityId ?? ""} data-edge-id={edge?.id ?? ""}>
    <p className="connections-live" role="status" aria-live="polite" aria-atomic="true">{selected ? `Browsing links for ${identityFor(selected).title}. ` : ""}{edge && source && target ? `${CONNECTION_MEANING[edge.category].label}: ${identityFor(source).title} to ${identityFor(target).title}.` : selected ? `${allEdges.length} recorded record-level connections. Choose a connection to inspect.` : "No observations available."}</p>
    <RecordedPaths items={items} catalog={catalog} base={base} startingId={state.entityId} inspectedEdgeId={edge?.id ?? null} onInspect={(step) => {
      visit({ entityId: step.fromId, edgeId: step.edge.id, category: "all", query: "" });
      setInspectionRequest((request) => request + 1);
    }} />
    <div className="connections-workspace">
      <aside className="connections-browser" aria-label="Choose an observation and connection">
        <label htmlFor="connections-record">Start with an observation</label>
        <select id="connections-record" disabled={!ready} value={state.entityId ?? ""} onChange={(event) => start(event.target.value)}>
          {items.map((item) => <option key={item.id} value={item.id}>{identityFor(item).title} · {connectionsFor(catalog, item.id).length} links</option>)}
        </select>
        <label htmlFor="connections-search">Find an observation</label>
        <input id="connections-search" type="search" disabled={!ready} value={state.query} onChange={(event) => visit({ ...state, query: event.target.value }, true)} placeholder="Heart, quartz, ECG, light…" />
        {query && <div className="connections-search-results" role="group" aria-label="Matching observations">
          {matching.map((item) => <button type="button" key={item.id} data-search-record={item.id} onClick={() => start(item.id, null, true)}><PhenomenonIcon item={item} /><span>{identityFor(item).title}<small>{item.name}</small></span></button>)}
          {!matching.length && <p>No observations match this search.</p>}
          <button type="button" onClick={() => { visit({ ...state, query: "" }, true); document.getElementById("connections-search")?.focus({ preventScroll: true }); }}>Clear search</button>
        </div>}
        {selected && <div className="connections-starting"><PhenomenonIcon item={selected} /><div><h2>{identityFor(selected).title}</h2><p>{allEdges.length} recorded {allEdges.length === 1 ? "link" : "links"} · incoming and outgoing</p></div></div>}
        <div className="connections-filters" role="group" aria-label="Filter relationship category">
          {(["all", ...CONNECTION_CATEGORIES.filter((category) => allEdges.some((entry) => entry.category === category) || state.category === category)] as ConnectionState["category"][]).map((category) =>
            <button type="button" key={category} data-kind={category} id={category === "all" ? "connections-all-types" : undefined} aria-pressed={state.category === category} disabled={!ready}
              onClick={() => { if (state.category !== category) visit({ ...state, category, edgeId: null }); }}>{category === "all" ? "All types" : category}</button>)}
        </div>
        <div className="connections-edge-list" role="group" aria-label="Recorded links for this observation">{edges.map((entry) => {
          const outgoing = entry.sourceId === state.entityId, peerId = outgoing ? entry.targetId : entry.sourceId, peer = byId.get(peerId)!;
          return <button type="button" key={entry.id} data-edge-choice={entry.id} data-category={entry.category} aria-pressed={entry.id === edge?.id} disabled={!ready}
            onClick={() => visit({ ...state, edgeId: entry.id })}>
            <span className="connections-category">{CONNECTION_MEANING[entry.category].label}</span>
            <span className="connections-peer"><PhenomenonIcon item={peer} /><strong>{identityFor(peer).title}</strong></span>
            <small>{readable(entry.type).toLowerCase()}</small><small>{entry.sourceId === entry.targetId ? "Self-link" : outgoing ? "Outgoing from this observation" : "Incoming to this observation"}</small>
          </button>;
        })}</div>
        {!edges.length && <div className="connections-empty-list"><p>{allEdges.length ? "No links match this category." : "No record-level connections are recorded for this observation. That does not prove it is physically unrelated to everything else."}</p>
          {state.category !== "all" && <button type="button" onClick={() => { visit({ ...state, category: "all", edgeId: null }); document.getElementById("connections-all-types")?.focus({ preventScroll: true }); }}>Show all types</button>}
          {selected && !allEdges.length && <a href={`${base}phenomena/${encodeURIComponent(selected.id)}/`}>Inspect the original source record ↗</a>}
        </div>}
      </aside>
      <div id="connections-selected-detail" tabIndex={-1} className="connections-detail" aria-label="Selected recorded connection">
        {edge && source && target ? <div key={edge.id} data-connection-category={edge.category}>
          <header className={`connections-meaning is-${edge.category}`}><span className="connections-eyebrow">RECORDED LINK · NOT A NEW SUGGESTION</span>
            <h2>{CONNECTION_MEANING[edge.category].label}</h2><p>{CONNECTION_MEANING[edge.category].caution}</p>
            <strong>{readable(edge.type).toLowerCase()}</strong></header>
          <div className="connections-pair"><Endpoint item={source} letter="A" base={base} onContinue={() => continueFrom(source.id, edge.id)} /><Endpoint item={target} letter="B" base={base} onContinue={() => continueFrom(target.id, edge.id)} /></div>
          <p className="connections-direction">Stored link: A → B. For coincidences and associations, this is record direction—not signal flow or causation.</p>
          <PairScale source={source} target={target} model={model} />
          <RelationshipEvidence edge={edge} base={base} />
        </div> : <section className="connections-welcome"><span className="connections-eyebrow">ONE CONNECTION AT A TIME</span><h2>What connects this observation?</h2>
          <p>Choose a recorded link to see both observations and the explanation. Matching numbers and physical mechanisms are different kinds of connection.</p>
          <div><b>01</b><p>Choose a familiar observation.</p></div><div><b>02</b><p>Open one of its incoming or outgoing links.</p></div><div><b>03</b><p>Inspect the evidence, or continue from the other observation.</p></div>
          {selected && <p><a href={journeyRecordLink(selected, base, "explore")}>Inspect {identityFor(selected).title} in Atlas ↗</a></p>}
        </section>}
      </div>
    </div>
    <footer className="connections-footer"><p>{catalog.edges.length} stored record-level relationships · no automatic matches, inferred edges or confidence scores.</p>
      <details><summary>Scope of this graph view</summary><p>This view connects original phenomenon records. Local systems, observables, detectors and other nodes are not silently replaced by their owning phenomenon.</p>
        <p>{catalog.nodeEdges.length} node-level {catalog.nodeEdges.length === 1 ? "relationship is" : "relationships are"} available in the original source records rather than this pair view.</p>
        {catalog.nodeEdges.length > 0 && <ul>{catalog.nodeEdges.map((entry) => <li key={entry.id}><a href={`${base}phenomena/${encodeURIComponent(entry.ownerId)}/`}>{entry.id} — {entry.ownerName}</a></li>)}</ul>}
      </details>
    </footer>
  </div>;
}
