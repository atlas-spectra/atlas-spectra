import {
  Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState,
  type ReactNode, type KeyboardEvent,
} from "react";
import type { ExplorerItem } from "../lib/corpus";
import FlightEvidence from "./FlightEvidence";
import { PhenomenonIcon } from "./PhenomenonIdentity";
import { FlightDepthOverview, FlightLandmarkFace } from "./FlightOrientation";
import { ProcessGroupPanel } from "./ProcessGroup";
import { groupForRecord, groupMembers, projectDiscovery } from "../lib/process-groups";
import { identityFor, identitySearchText } from "../lib/phenomenon-identity";
import {
  adjacentLandmarks, buildFlightModel, boundedCoordinate, flightDepthWindow, flightRecordLocation,
  formatFlightHz, landmarkCoordinates, nearbyRecords, parseCoordinate, planFlightLabels,
  projectPoint, recordCoordinate, SCROLL_PER_DECADE,
} from "../lib/flight";
import "../styles/flight.css";

const FlightScene = lazy(() => import("./FlightScene"));
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
interface Props { items: ExplorerItem[]; lanes: string[]; base: string }

export default function FrequencyFlight({ items, lanes, base }: Props) {
  // Full model owns bounds, lateral offsets, exact coordinates and every record lookup.
  const model = useMemo(() => buildFlightModel(items, lanes), [items, lanes]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const recordsById = useMemo(() => new Map(model.records.map((record) => [record.id, record])), [model]);
  const [at, setAt] = useState(model.start);
  const coordinateRef = useRef(model.start);
  const synchronizedScrollTop = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [scrollMotion, setScrollMotion] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [renderer, setRenderer] = useState<"checking" | "loading" | "ready" | "unavailable">("checking");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [size, setSize] = useState({ width: 900, height: 570 });
  const railRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const returnGroupFocus = useRef<string | null>(null);
  const selected = selectedId ? byId.get(selectedId) : null;
  const range = model.bounds.max - model.bounds.min;
  const projection = useMemo(() => projectDiscovery(items, selectedId, detailed), [items, selectedId, detailed]);
  const contextProjection = useMemo(() => projectDiscovery(items, null, detailed), [items, detailed]);
  const sceneModel = useMemo(() => {
    const ids = new Set(projection.items.map((item) => item.id));
    return { ...model, records: model.records.filter((record) => ids.has(record.id)) };
  }, [model, projection]);
  const contextModel = useMemo(() => {
    const ids = new Set(contextProjection.items.map((item) => item.id));
    return { ...model, records: model.records.filter((record) => ids.has(record.id)) };
  }, [model, contextProjection]);
  const selectedGroup = groupForRecord(selectedId);
  const activeGroup = selectedGroup && groupMembers(selectedGroup, items).length === selectedGroup.facets.length ? selectedGroup : undefined;

  const syncScroll = useCallback((value: number) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollTop = (value - model.bounds.min) / range * Math.max(0, rail.scrollHeight - rail.clientHeight);
    // A rounded browser acknowledgement must not overwrite a precise coordinate.
    synchronizedScrollTop.current = rail.scrollTop;
  }, [model, range]);
  const jump = useCallback((value: number) => {
    const next = boundedCoordinate(value, model.bounds);
    coordinateRef.current = next; setAt(next);
    if (scrollMotion) syncScroll(next);
  }, [model, scrollMotion, syncScroll]);
  const choose = useCallback((id: string, anchor?: number) => {
    if (!byId.has(id)) return;
    setSelectedId(id);
    const record = recordsById.get(id);
    // Opening a grouped scene label reveals its facets without moving the camera.
    // Search/catalog navigation still takes the user to the requested observation.
    if (record && !(anchor !== undefined && projection.collapsed.has(id))) {
      jump(recordCoordinate(record, anchor ?? coordinateRef.current));
    }
  }, [byId, recordsById, jump, projection]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { setReducedMotion(media.matches); setScrollMotion(!media.matches); };
    change(); media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("entity"), next = parseCoordinate(params.get("at"), model);
      coordinateRef.current = next; setAt(next);
      setSelectedId(id && byId.has(id) ? id : null);
      setDetailed(params.get("detail") === "observations");
      syncScroll(next); setReady(true);
    };
    sync(); window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [model, byId, syncScroll]);
  useEffect(() => { if (ready && scrollMotion) syncScroll(coordinateRef.current); }, [ready, scrollMotion, syncScroll, size]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("at", String(at));
      selectedId ? url.searchParams.set("entity", selectedId) : url.searchParams.delete("entity");
      detailed ? url.searchParams.set("detail", "observations") : url.searchParams.delete("detail");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [at, selectedId, ready, detailed]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try {
      const probe = document.createElement("canvas"), gl = probe.getContext("webgl2");
      if (!gl) { setRenderer("unavailable"); return; }
      gl.getExtension("WEBGL_lose_context")?.loseContext(); setRenderer("loading");
    } catch { setRenderer("unavailable"); }
  }, []);
  const onReady = useCallback(() => setRenderer("ready"), []);
  const onLost = useCallback(() => setRenderer("unavailable"), []);

  const plan = useMemo(() => planFlightLabels(sceneModel, at, size.width, size.height, selectedId), [sceneModel, at, size, selectedId]);
  const labels = plan.labels;
  const labeledIds = new Set(renderer === "ready" ? labels.map((label) => label.record.id) : []);
  const depthWindow = flightDepthWindow(model, at, size.width, size.height);
  const nearby = useMemo(() => nearbyRecords(contextModel, at), [contextModel, at]);
  const normalizedQuery = query.trim().toLowerCase();
  const catalog = normalizedQuery ? items.filter((item) => {
    const group = groupForRecord(item.id);
    return [item.name, item.id, item.summary, item.lane, ...item.domains, identitySearchText(item), group?.title ?? ""]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  }) : showAll ? items : nearby.slice(0, 6).map((record) => byId.get(record.id)!);
  const stops = useMemo(() => landmarkCoordinates(model), [model]);
  const { previous, next } = adjacentLandmarks(stops, at);
  const atlasUrl = `${base}explore/?center=${String(at)}&span=4${selectedId ? `&entity=${encodeURIComponent(selectedId)}` : ""}${detailed ? "&detail=observations" : ""}`;
  const selectedRecord = selectedId ? recordsById.get(selectedId) : undefined;

  function collapseGroup() {
    if (!activeGroup) return;
    returnGroupFocus.current = activeGroup.anchorId;
    setSelectedId(null); setDetailed(false);
  }
  useEffect(() => {
    const id = returnGroupFocus.current;
    if (!id) return;
    const button = Array.from(stageRef.current?.querySelectorAll<HTMLButtonElement>(".flight-label") ?? []).find((el) => el.dataset.recordId === id);
    (button ?? document.getElementById("flight-discover-mode"))?.focus();
    returnGroupFocus.current = null;
  }, [selectedId, detailed]);
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 0.25 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -0.25 : 0;
    if (delta) { event.preventDefault(); jump(at + delta); }
    if (event.key === "Home") { event.preventDefault(); jump(model.bounds.min); }
    if (event.key === "End") { event.preventDefault(); jump(model.bounds.max); }
  }

  return <div className="flight-experience" data-ready={ready} data-renderer={renderer} data-detail-mode={detailed ? "observations" : "discover"}
    data-coordinate={at} data-min={model.bounds.min} data-max={model.bounds.max}>
    <p className="flight-status" role="status" aria-live="polite" aria-atomic="true">{selected ? `Selected ${identityFor(selected).title}.${activeGroup ? ` Observation of ${activeGroup.title}.` : ""} Original evidence is in the selected flight record panel.` : "No flight observation selected."}</p>
    <div className="flight-toolbar">
      <div className="flight-mode"><a href={atlasUrl}>Atlas · 2D</a><span aria-current="page">Flight · 3D</span></div>
      <label className="flight-motion"><input type="checkbox" checked={scrollMotion} onChange={(event) => setScrollMotion(event.target.checked)} /> Scroll to fly</label>
      <button type="button" onClick={() => jump(model.start)}>Reset flight</button>
    </div>
    <div className="flight-discovery-mode"><div role="group" aria-label="Flight level of detail">
      <button id="flight-discover-mode" type="button" aria-pressed={!detailed} onClick={() => { setDetailed(false); if (activeGroup) setSelectedId(null); }}>Discover</button>
      <button type="button" aria-pressed={detailed} onClick={() => setDetailed(true)}>All observations</button>
    </div><p>{detailed ? "Every observation stays distinct. Shared numbers do not imply a shared process." : "One process first. Select a grouped landmark to explore its observations."}</p></div>
    {reducedMotion && <p className="flight-motion-note">Reduced motion: scroll flight starts off. Use the ruler or buttons for discrete steps, or enable it explicitly.</p>}
    <div className="flight-layout">
      <section className="flight-instrument" aria-label="Frequency Flight instrument">
        <div className="flight-theater">
          <div ref={railRef} className="flight-rail" tabIndex={0} role="region" aria-label="Frequency flight navigation" onKeyDown={key}
            onScroll={(event) => {
              if (!scrollMotion || !ready) return;
              const rail = event.currentTarget;
              if (synchronizedScrollTop.current !== null) {
                const synchronized = Math.abs(rail.scrollTop - synchronizedScrollTop.current) < 0.01;
                synchronizedScrollTop.current = null;
                if (synchronized) return;
              }
              const travel = rail.scrollHeight - rail.clientHeight;
              if (travel <= 0) return;
              const value = boundedCoordinate(model.bounds.min + rail.scrollTop / travel * range, model.bounds);
              coordinateRef.current = value; setAt(value);
            }}>
            <div className="flight-track" style={{ height: scrollMotion ? `calc(var(--flight-height) + ${range * SCROLL_PER_DECADE}px)` : "var(--flight-height)" }}>
              <div ref={stageRef} className="flight-stage">
                <div className="flight-canvas" aria-hidden="true">
                  {(renderer === "loading" || renderer === "ready") && <SceneBoundary onError={onLost}>
                    <Suspense fallback={null}><FlightScene model={sceneModel} at={at} selectedId={selectedId} onReady={onReady} onLost={onLost} /></Suspense>
                  </SceneBoundary>}
                </div>
                <div className="flight-hud"><span>YOUR DISPLAY COORDINATE</span><strong>{formatFlightHz(at)}</strong><small>log₁₀ = {at.toFixed(2)} · each gate is ×10</small></div>
                {renderer === "unavailable" ? <div className="flight-fallback" role="status">
                  <span className="flight-kicker">The atlas is still here</span><h2>3D is unavailable on this device.</h2>
                  <p>Search, step through frequencies, and inspect every record below. Or continue in the precise 2D atlas.</p><a href={atlasUrl}>Open the 2D atlas →</a>
                </div> : renderer !== "ready" ? <p className="flight-loading" role="status">Preparing the frequency corridor…</p> : <>
                  <svg className="flight-leaders" width={size.width} height={size.height} aria-hidden="true">
                    {labels.map((label) => <g key={label.record.id}><line x1={label.anchorX} y1={label.anchorY}
                      x2={Math.max(label.left, Math.min(label.left + label.width, label.anchorX))} y2={label.top + label.height / 2} /><circle cx={label.anchorX} cy={label.anchorY} r="3" /></g>)}
                  </svg>
                  <div className="flight-labels" aria-label="Visible flight landmarks">
                    {labels.map((label) => {
                      const item = byId.get(label.record.id)!, group = projection.collapsed.get(item.id);
                      return <button type="button" key={item.id}
                        className={`flight-label${item.id === selectedId ? " is-selected" : ""}${label.record.kind === "reference" ? " is-reference" : ""}`}
                        data-record-id={item.id} data-anchor-coordinate={label.coordinate} data-group-id={group?.id}
                        aria-expanded={group ? false : undefined} aria-label={`${group?.title ?? identityFor(item).title}: ${item.name}${group ? `; explore ${group.facets.length} observations` : ""}`}
                        title={item.name} style={{ left: label.left, top: label.top, width: label.width, height: label.height }} onClick={() => choose(item.id, label.coordinate)}>
                        <FlightLandmarkFace item={item} group={group} />
                      </button>;
                    })}
                  </div>
                  <div className="flight-gates" aria-hidden="true">{Array.from({ length: 2 }, (_, index) => Math.ceil(at) + index).map((decade) => {
                    const p = projectPoint(-6.7, -4.4, decade, at, size.width, size.height);
                    return p && p.x > 8 && p.y < size.height - 35 ? <span key={decade} style={{ left: p.x, top: p.y }}>10<sup>{decade}</sup></span> : null;
                  })}</div>
                  {!labels.length && <p className="flight-open-space">No label anchors in this view.<br />Use the ruler or nearby records below to continue.</p>}
                </>}
                <div className="flight-floor-note"><span>{scrollMotion ? "SCROLL / SWIPE TO TRAVEL" : "USE THE RULER TO TRAVEL"}</span><span>DEPTH = LOG FREQUENCY</span></div>
              </div>
            </div>
          </div>
        </div>
        {selected && !labeledIds.has(selected.id) && <div className="flight-selection-location">
          <p><strong>{identityFor(selected).title}</strong> · {renderer === "ready" ? flightRecordLocation(selectedRecord, at, depthWindow, labeledIds) : "3D labels unavailable"}.
            {!selectedRecord && " No coordinate is invented; its record remains inspectable below."}</p>
          {selectedRecord && <button type="button" onClick={() => jump(recordCoordinate(selectedRecord, coordinateRef.current))}>Return to selection</button>}
        </div>}
        <div className="flight-scale">
          <FlightDepthOverview model={model} at={at} width={size.width} height={size.height} labeled={labels.length} eligible={plan.eligibleCount} available={renderer === "ready"} />
          <label htmlFor="flight-coordinate">Frequency ruler <span>Hz-equivalent display coordinate</span></label>
          <input id="flight-coordinate" type="range" min={model.bounds.min} max={model.bounds.max} step="0.01" value={at}
            aria-valuetext={`${formatFlightHz(at)}, logarithmic display coordinate`} onChange={(event) => jump(Number(event.target.value))} />
          <div className="flight-scale-ends"><span>{formatFlightHz(model.bounds.min)}</span><span>{range.toFixed(1)} decades in this corpus</span><span>{formatFlightHz(model.bounds.max)}</span></div>
          <div className="flight-step-buttons"><button type="button" disabled={previous === undefined} onClick={() => previous !== undefined && jump(previous)}>← Previous landmark</button><button type="button" disabled={next === undefined} onClick={() => next !== undefined && jump(next)}>Next landmark →</button></div>
        </div>
        {activeGroup && <ProcessGroupPanel group={activeGroup} items={items} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} onCollapse={collapseGroup} />}
        <div className="flight-legend" aria-label="Flight mark legend"><span>● Point</span><span>▱ Range / extent</span><span>┆ Discrete lines</span><span>◇ Claim reference</span></div>
        <p className="flight-caution">Depth uses the atlas’s existing display transforms. Sideways placement organizes domains, not physical distance. Grouped marks use a named reference observation, not an aggregate frequency. Proximity does not establish a mechanism.</p>
        <section className="flight-catalog" aria-label="Flight record browser">
          <div className="flight-catalog-heading"><h2>{normalizedQuery ? "Search results" : showAll ? "All records" : "Nearby landmarks"}</h2>
            <button type="button" onClick={() => { setQuery(""); setShowAll(!showAll); }}>{showAll ? "Show nearby" : `Browse all ${items.length}`}</button></div>
          <label htmlFor="flight-search">Find a phenomenon</label><input id="flight-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false); }} placeholder="Heartbeat, A4, quartz, light…" />
          <div className="flight-records">{catalog.map((item) => {
            const group = !normalizedQuery && !showAll ? contextProjection.collapsed.get(item.id) : undefined;
            return <button type="button" key={item.id} data-record-id={item.id} data-group-id={group?.id} data-positioned={recordsById.has(item.id)}
              aria-label={`${group?.title ?? identityFor(item).title}: ${item.name}`} onClick={() => choose(item.id)}>
              <FlightLandmarkFace item={item} group={group} /><small className="flight-record-location">{flightRecordLocation(recordsById.get(item.id), at, depthWindow, labeledIds)}</small>
            </button>;
          })}</div>
          {!catalog.length && <p>No matching records. Try another name or domain.</p>}
          <p className="flight-catalog-note">{model.records.length} positioned · {model.unpositionedIds.length} unpositioned source observations. Nearby means numerical proximity, not physical connection. Browse all includes every canonical record.</p>
        </section>
      </section>
      <aside className="flight-inspector" aria-label="Selected flight record" data-selected-id={selected?.id ?? ""}>
        {selected ? <>
          <div className="flight-inspector-heading"><span className="flight-kicker">{selected.lane}</span><button type="button" aria-label="Close flight detail" onClick={() => setSelectedId(null)}>×</button></div>
          {activeGroup && <p className="flight-group-origin">Observation of <strong>{activeGroup.title}</strong></p>}
          <div className="flight-identity-heading"><PhenomenonIcon item={selected} /><h2>{selected.name}</h2></div><p>{selected.summary}</p>
          <dl><div><dt>Representation</dt><dd>{selected.profileType.replaceAll("_", " ")}</dd></div>
            <div><dt>Native axis</dt><dd>{selected.axisKind.replaceAll("_", " ")}</dd></div>
            <div><dt>Native value</dt><dd>{selected.display?.nativeLabel ?? "Unresolved"}</dd></div>
            <div><dt>Display mapping</dt><dd>{selected.display?.mode ?? "Unpositioned"}</dd></div></dl>
          <p className="flight-mapping">{selected.display?.note ?? "No supported quantitative display coordinate. This record is not placed in the corridor."}</p>
          {selected.display && selected.display.lowHz !== selected.display.highHz && <p className="flight-mapping">The 3D object shows an extent only—not a measured amplitude, spectrum shape, or time trajectory.</p>}
          <FlightEvidence item={selected} />
          {selected.relationships.length > 0 && <section><h3>Connections in the dataset</h3>{selected.relationships.slice(0, 3).map((r) => <div className="flight-relationship" key={r.id}>
            <strong>{r.type.replaceAll("_", " ")}</strong><span>{r.direction} · {r.peerName}</span><small>{r.category} · mechanism: {r.evidence?.mechanism_status ?? "unspecified"}</small>
          </div>)}</section>}
          {selected.sources.length > 0 && <section><h3>Sources</h3>{selected.sources.slice(0, 3).map((source) => <p className="flight-source" key={source.id}>{source.url ? <a href={source.url}>{source.title}</a> : source.title}</p>)}</section>}
          <a className="flight-detail-link" href={`${base}phenomena/${encodeURIComponent(selected.id)}/`}>Full record & provenance →</a><a className="flight-detail-link" href={atlasUrl}>Compare in the 2D atlas →</a>
        </> : <>
          <span className="flight-kicker">A different perspective</span><h2>Travel through scale.</h2><p>Move forward from slow rhythms to faster oscillations. Each frame marks a tenfold change in the display coordinate.</p>
          <div className="flight-instruction"><b>01</b><p>Scroll or swipe inside the corridor. The shaded overview shows the local depth window.</p></div>
          <div className="flight-instruction"><b>02</b><p>Recognize a subject, then open it. Heart activity unfolds into independently inspectable observations.</p></div>
          <div className="flight-instruction"><b>03</b><p>Use All observations for comparison. Nearby records stay accessible when their labels do not fit.</p></div>
          <p className="flight-mapping">Hollow amber objects are claim references, not measurements of the phenomenon’s physical spectrum.</p><a className="flight-detail-link" href={atlasUrl}>Open the precise 2D atlas →</a>
        </>}
      </aside>
    </div>
  </div>;
}
