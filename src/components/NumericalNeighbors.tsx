import { useEffect, useMemo, useRef, useState } from "react";
import type { ExplorerItem } from "../lib/corpus";
import { findNumericalNeighbors, numericalSearch, readNumericalState, NUMERICAL_MAX_RECORDS, NUMERICAL_MAX_SEGMENTS,
  type NumericalInput, type NumericalState, type NumericalMatch, type NumericRange } from "../lib/numerical-neighbors";
import { CONNECTION_MEANING, connectionSearch, type ConnectionCatalog } from "../lib/recorded-connections";
import { identityFor } from "../lib/phenomenon-identity";
import { journeyRecordLink } from "../lib/signal-journeys";
import { PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import FlightEvidence from "./FlightEvidence";
import "../styles/numerical-neighbors.css";

const PAGE_SIZE = 8;
const LABELS: Record<NumericalMatch["kind"], string> = {
  "same-extent": "Same documented extent", "boundary-only": "Boundary-only match",
  "shared-points": "Shared point coordinates", "overlapping-extents": "Overlapping documented extents",
};
const readable = ([a, b]: NumericRange) => a === b ? a.toLocaleString("en-US", { maximumSignificantDigits: 7 })
  : `${a.toLocaleString("en-US", { maximumSignificantDigits: 7 })}–${b.toLocaleString("en-US", { maximumSignificantDigits: 7 })}`;
const exact = ([a, b]: NumericRange) => `[${a}, ${b}]`;
const qualifier = (input: NumericalInput) => input.status === "unpositioned" ? "Unpositioned observation"
  : input.status === "unsupported" ? "Unsupported comparison input"
  : input.coordinateMode === "claim-reference" ? "Navigational claim reference"
  : input.profileType === "event_rate" ? "Event rate, not a waveform" : input.coordinateMode === "transformed" ? "Transformed coordinate" : "Documented frequency coordinate";

export default function NumericalNeighbors({ items, inputs, catalog, base }: {
  items: ExplorerItem[]; inputs: NumericalInput[]; catalog: ConnectionCatalog; base: string;
}) {
  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [state, setState] = useState<NumericalState | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);
  const afterChange = useRef<"heading" | "trigger" | null>(null);
  useEffect(() => {
    const restore = () => { setState(readNumericalState(location.search, ids)); setPage(0); setReady(true); };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [ids]);
  useEffect(() => {
    if (!afterChange.current) return;
    document.getElementById(afterChange.current === "heading" ? "numerical-heading" : "numerical-trigger")?.focus({ preventScroll: true });
    afterChange.current = null;
  }, [state]);
  const report = useMemo(() => state ? findNumericalNeighbors(inputs, state) : null, [inputs, state]);
  function change(next: NumericalState | null) {
    if (!ready) return;
    const safe = readNumericalState(numericalSearch("", next), ids);
    if (numericalSearch("", safe) === numericalSearch("", state)) return;
    const url = new URL(location.href); url.search = numericalSearch(url.search, safe);
    history.pushState({ ...history.state }, "", `${url.pathname}${url.search}${url.hash}`);
    setState(safe); setPage(0);
  }
  function downloadReport() {
    if (!report || report.status !== "complete") return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + "\n"], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "atlas-spectra-numerical-overlap.json";
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
  }
  if (!state || !report) return <div className="numerical-entry">
    <button id="numerical-trigger" type="button" disabled={!ready} onClick={() => {
      const current = new URLSearchParams(location.search).get("entity");
      const anchorId = current && ids.has(current) ? current : inputs.find((i) => i.status === "eligible" && i.coordinateMode !== "claim-reference")?.id ?? null;
      afterChange.current = "heading"; change({ anchorId, includeReferences: false });
    }}>Find numerical neighbors</button><p>What overlaps on the scale? Compare numbers without creating a connection.</p>
  </div>;
  const anchor = report.anchor, anchorItem = anchor ? byId.get(anchor.id) : undefined;
  const visible = report.matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const summary = report.status === "complete" ? `${report.counts.matches} numerical ${report.counts.matches === 1 ? "match" : "matches"} across ${report.counts.comparedPeers} compared observations. ${report.counts.excludedPeers} excluded.` : report.reason;
  return <section className="numerical-panel" aria-label="Numerical neighbors" data-numerical-status={report.status} data-numerical-anchor={state.anchorId ?? ""}>
    <header><div><p className="numerical-eyebrow">NUMBERS, NOT NEW RELATIONSHIPS</p><h2 id="numerical-heading" tabIndex={-1}>What shares this part of the scale?</h2></div>
      <button type="button" onClick={() => { afterChange.current = "trigger"; change(null); }}>Close numerical comparison</button></header>
    <div className="numerical-controls"><label htmlFor="numerical-anchor">Compare this observation<select id="numerical-anchor" value={state.anchorId ?? ""} onChange={(e) => change({ ...state, anchorId: e.target.value || null })}>
      <option value="">Choose an observation</option>{items.map((i) => <option key={i.id} value={i.id}>{identityFor(i).title}</option>)}
    </select></label><label className="numerical-reference-choice"><input type="checkbox" checked={state.includeReferences} onChange={(e) => change({ ...state, includeReferences: e.target.checked })} />Include navigational claim references</label></div>
    <p className="numerical-caution">Matching numbers do not establish physical coupling, identical signals, or independent measurements. Related observations may reuse the same reference range.</p>
    {anchor && anchorItem && <div className="numerical-anchor-card"><PhenomenonIcon item={anchorItem} /><div><strong>{identityFor(anchorItem).title}</strong><span>{anchorItem.display ? phenomenonValue(anchorItem) : "No frequency assigned"}</span><small>{qualifier(anchor)} · {anchor.coordinateNote}</small></div></div>}
    <p className="numerical-status" role="status" aria-live="polite" aria-atomic="true">{summary}</p>
    {report.status === "complete" && !report.matches.length && <p className="numerical-empty">No exact coordinate overlap in this catalog under these settings. This does not mean there are no physical relationships or approximate matches.</p>}
    {anchor && anchorItem && <ol className="numerical-matches" aria-label="Computed numerical matches" key={`${anchor.id}:${state.includeReferences}`}>
      {visible.map((match) => {
        const peer = byId.get(match.peer.id)!;
        const links = catalog.edges.filter((e) => (e.sourceId === anchor.id && e.targetId === peer.id) || (e.targetId === anchor.id && e.sourceId === peer.id));
        return <li key={peer.id} data-numerical-peer={peer.id} data-numerical-kind={match.kind}>
          <div className="numerical-match-heading"><div className="numerical-subject"><PhenomenonIcon item={peer} /><div><h3>{identityFor(peer).title}</h3><p>{identityFor(peer).subtitle}</p><strong>{phenomenonValue(peer)}</strong><small>{qualifier(match.peer)}</small></div></div>
            <div className="numerical-shared"><span>{LABELS[match.kind]}</span><strong>{match.intersections.slice(0, 3).map((v) => readable(v.sharedHz)).join("; ")}{match.intersections.length > 3 ? `; +${match.intersections.length - 3} more` : ""}</strong><small>per second on the common scale</small></div></div>
          {match.kind === "boundary-only" && <p className="numerical-boundary">Only an endpoint matches—not the whole range.</p>}
          <details className="numerical-calculation"><summary>Calculation & original observation evidence</summary>
            <p>Intersect the documented coordinate intervals: take the larger lower bound and the smaller upper bound. Values below are the exact floating-point inputs, without display rounding.</p>
            <ul>{match.intersections.map((v, i) => <li key={i}><code>{exact(v.anchorHz)} ∩ {exact(v.peerHz)} = {exact(v.sharedHz)}</code></li>)}</ul>
            <p>These are coordinate extents, not spectral power, phase, coherence, a harmonic analysis, or a significance test. Different conditions and measurement methods may apply.</p>
            <p><strong>Anchor conversion:</strong> {anchor.coordinateNote}<br /><strong>Peer conversion:</strong> {match.peer.coordinateNote}</p>
            <details><summary>Exact input fields</summary><p>{anchor.id}: {anchor.quantityTargets.join(", ")}</p><p>{peer.id}: {match.peer.quantityTargets.join(", ")}</p></details>
            <h4>Recorded links are separate</h4>{links.length ? <><p>Open a standalone pair view with this numerical comparison retained. The independent path finder is not carried into that destination.</p><ul>{links.map((e) => <li key={e.id}><a href={`${base}connections/?${connectionSearch(numericalSearch("", state), { entityId: anchor.id, edgeId: e.id, category: "all", query: "" })}#connections-selected-detail`}>{CONNECTION_MEANING[e.category].label} · open original link & evidence ↗</a></li>)}</ul></>
              : <p>No direct record-level link between this pair is currently recorded. The numerical comparison does not create one, and absence of a link does not prove that the observations are unrelated.</p>}
            <details><summary>Anchor observation evidence</summary><FlightEvidence item={anchorItem} connectionsLink={false} /></details>
            <details><summary>Peer observation evidence</summary><FlightEvidence item={peer} connectionsLink={false} /></details>
            <p><a href={journeyRecordLink(peer, base, "explore")}>Inspect {identityFor(peer).title} in Atlas ↗</a> · <a href={`${base}phenomena/${encodeURIComponent(peer.id)}/`}>Full peer record & conditions ↗</a></p>
          </details>
        </li>;
      })}
    </ol>}
    {report.matches.length > PAGE_SIZE && <div className="numerical-pagination" role="group" aria-label="Numerical match pages"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous matches</button><span>Page {page + 1} of {Math.ceil(report.matches.length / PAGE_SIZE)}</span><button type="button" disabled={(page + 1) * PAGE_SIZE >= report.matches.length} onClick={() => setPage(page + 1)}>Next matches</button></div>}
    <div className="numerical-report-actions"><button type="button" disabled={report.status !== "complete"} onClick={downloadReport}>Download calculation JSON</button><a href={`${base}data/numerical-neighbor-report.schema.json`}>Report schema ↗</a></div>
    <details className="numerical-method"><summary>Method, exclusions & limits</summary>
      <p>Exact intersections of documented coordinates, ordered by record ID—not confidence. Claim references are excluded unless enabled. No p-value, statistical significance, or multiple-comparison correction is claimed. Counts report the comparisons performed.</p>
      <p>One anchor versus at most {NUMERICAL_MAX_RECORDS.toLocaleString("en-US")} records; up to {NUMERICAL_MAX_SEGMENTS} original line positions per input. Ranged lines are excluded rather than compared at invented midpoints. A maximum of {PAGE_SIZE} match cards is rendered per page; the JSON contains every result.</p>
      <p>The exported snapshots record the inputs used, not a reviewed scientific finding or an immutable copy of the whole corpus.</p>
      {report.status !== "complete" ? <p>Peer comparison was not performed for this selection.</p> : report.exclusions.length ? <ul>{report.exclusions.map((entry) => <li key={entry.id}><strong>{byId.get(entry.id) ? identityFor(byId.get(entry.id)!).title : entry.id}:</strong> {entry.reason}</li>)}</ul> : <p>No peer exclusions were recorded for this calculation.</p>}
    </details>
  </section>;
}
