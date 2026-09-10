import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { ExplorerItem, MarkKind } from "../lib/corpus";
import FlightEvidence from "./FlightEvidence";
import { atlasAxisTicks } from "../lib/atlas-axis";
import { atlasBounds, boundView, clamp, extentOf, fitAll, fitItems, formatCoordinate, geometryFor, hitAtlas, itemCoordinate, laneColor, layoutAtlas, MARK_LABELS, matchesAtlas, readAtlasState, zoomView, type AtlasView } from "../lib/atlas-view";
import "../styles/atlas-workspace.css";

interface Props { items: ExplorerItem[]; lanes: string[] }
function Glyph({ kind }: { kind: MarkKind }) { return <span className={`atlas-glyph atlas-glyph-${kind}`} aria-hidden="true" />; }

export default function FrequencyExplorer({ items, lanes }: Props) {
  const base = import.meta.env.BASE_URL;
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const bounds = useMemo(() => atlasBounds(items), [items]);
  const [view, setView] = useState(() => fitAll(bounds));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lane, setLane] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [browseAll, setBrowseAll] = useState(false);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(1000);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; view: AtlasView; moved: boolean } | null>(null);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const filtered = useMemo(() => items.filter((item) => matchesAtlas(item, query, lane)), [items, query, lane]);
  const availableLanes = useMemo(() => lanes.filter((name) => items.some((item) => item.lane === name)), [items, lanes]);
  const layout = useMemo(() => layoutAtlas(filtered, lanes, view, width), [filtered, lanes, view, width]);
  const g = useMemo(() => geometryFor(width, view), [width, view]);
  const positioned = filtered.filter((item) => extentOf(item));
  const hoveredMark = layout.marks.find((mark) => mark.item.id === hoveredId);
  const catalog = query.trim() || browseAll ? filtered : layout.marks.slice(0, 6).map((mark) => mark.item);
  const fitResults = fitItems(filtered, bounds);
  const fitSelection = selected ? fitItems([selected], bounds) : null;
  const flightUrl = `${base}flight/?at=${view.center}${selectedId ? `&entity=${encodeURIComponent(selectedId)}` : ""}`;
  const apply = useCallback((next: AtlasView | ((current: AtlasView) => AtlasView)) => {
    setHoveredId(null);
    setView((current) => boundView(typeof next === "function" ? next(current) : next, bounds));
  }, [bounds]);
  const focusItem = useCallback((id: string) => {
    const item = byId.get(id);
    if (!item) return;
    setSelectedId(id);
    setQuery("");
    setLane(null);
    const fit = fitItems([item], bounds);
    if (fit) apply(fit);
  }, [byId, bounds, apply]);

  useEffect(() => {
    const restore = () => {
      const state = readAtlasState(location.search, bounds, items, availableLanes);
      setView(state.view); setSelectedId(state.selectedId); setLane(state.lane); setQuery(""); setReady(true);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [bounds, items, availableLanes]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const url = new URL(location.href);
      url.searchParams.set("center", String(view.center)); url.searchParams.set("span", String(view.span));
      selectedId ? url.searchParams.set("entity", selectedId) : url.searchParams.delete("entity");
      lane ? url.searchParams.set("lane", lane) : url.searchParams.delete("lane");
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [view, selectedId, lane, ready]);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, Math.floor(entry.contentRect.width))));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return; // Keep native browser zoom available.
      const rect = frame.getBoundingClientRect();
      const geo = geometryFor(rect.width, view);
      const ratio = clamp((event.clientX - rect.left - geo.left) / geo.width, 0, 1);
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const dx = event.deltaX * unit, dy = event.deltaY * unit;
      event.preventDefault();
      apply((current) => Math.abs(dx) > Math.abs(dy)
        ? { ...current, center: current.center + dx / geo.width * current.span }
        : zoomView(current, Math.exp(clamp(dy * 0.0012, -4, 4)), ratio, bounds));
    };
    frame.addEventListener("wheel", wheel, { passive: false });
    return () => frame.removeEventListener("wheel", wheel);
  }, [apply, bounds, view]);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(layout.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, layout.height);
    ctx.fillStyle = "#fffefa"; ctx.fillRect(0, 0, width, layout.height);
    layout.lanes.forEach((row, index) => {
      ctx.fillStyle = index % 2 ? "#f6f7f3" : "#fffefa";
      ctx.fillRect(g.left, row.top, g.width, row.height);
      ctx.strokeStyle = "#e5e6df"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, row.top + row.height); ctx.lineTo(width, row.top + row.height); ctx.stroke();
    });
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    let lastLabelRight = g.left;
    for (const tick of atlasAxisTicks(view, g.width)) {
      const x = g.x(tick.log);
      ctx.strokeStyle = "#e5e7e0"; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(x, 35); ctx.lineTo(x, layout.height - 36); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = "#6b746c";
      const half = ctx.measureText(tick.label).width / 2;
      if (x - half >= lastLabelRight + 6 && x + half <= g.right - 4) {
        ctx.fillText(tick.label, x, layout.height - 15);
        lastLabelRight = x + half;
      }
    }
    ctx.textAlign = "left"; ctx.fillStyle = "#657065"; ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("Hz-equivalent · log scale", g.left + 5, 23);
    // Clip physical marks to the plot; all identifying labels are in the DOM.
    ctx.save(); ctx.beginPath(); ctx.rect(g.left, 35, g.width, layout.height - 70); ctx.clip();
    for (const mark of layout.marks) {
      const reference = mark.item.markKind === "reference";
      const emphasis = mark.item.id === selectedId || mark.item.id === hoveredId;
      const color = reference ? "#ac792a" : laneColor(mark.item.lane, lanes);
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = emphasis ? 2.5 : 1.8;
      if (reference) ctx.setLineDash([3, 3]);
      if (mark.extent.lines.length) {
        for (const x of mark.xs) { ctx.beginPath(); ctx.moveTo(x, mark.y - 7); ctx.lineTo(x, mark.y + 7); ctx.stroke(); }
      } else if (mark.extent.low === mark.extent.high) {
        ctx.beginPath(); ctx.arc(mark.x, mark.y, emphasis ? 6 : 4, 0, Math.PI * 2);
        reference ? ctx.stroke() : ctx.fill();
      } else {
        const height = mark.item.markKind === "spectrum" ? 12 : 8;
        ctx.globalAlpha = 0.16; ctx.fillRect(mark.x1, mark.y - height / 2, Math.max(2, mark.x2 - mark.x1), height); ctx.globalAlpha = 1;
        ctx.strokeRect(mark.x1, mark.y - height / 2, Math.max(2, mark.x2 - mark.x1), height);
        // Time-varying data gets an extent, not a fabricated diagonal/chirp track.
        ctx.setLineDash([]); ctx.beginPath();
        for (const x of [mark.x1, mark.x2]) { ctx.moveTo(x, mark.y - 7); ctx.lineTo(x, mark.y + 7); }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }, [g, layout, lanes, selectedId, hoveredId, view, width]);

  function local(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * layout.height / rect.height };
  }
  function down(event: PointerEvent<HTMLCanvasElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId); setHoveredId(null);
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    if (start && start.id === event.pointerId) {
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) start.moved = true;
      if (start.moved) apply({ ...start.view, center: start.view.center - (event.clientX - start.x) / g.width * start.view.span });
      return;
    }
    const p = local(event);
    setHoveredId(layout.marks.find((mark) => hitAtlas(mark, p.x, p.y))?.item.id ?? null);
  }
  function up(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!start.moved) { const p = local(event); setSelectedId(layout.marks.find((mark) => hitAtlas(mark, p.x, p.y))?.item.id ?? null); }
  }
  function key(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); apply((v) => ({ ...v, center: v.center + (event.key === "ArrowLeft" ? -1 : 1) * v.span * 0.08 }));
    } else if (["+", "=", "-"].includes(event.key)) {
      event.preventDefault(); apply((v) => zoomView(v, event.key === "-" ? 1.25 : 0.8, 0.5, bounds));
    } else if (event.key === "Home") { event.preventDefault(); apply(fitAll(bounds)); }
  }
  function changeLane(next: string | null) {
    setLane(next); setSelectedId(null);
    const fit = fitItems(items.filter((item) => matchesAtlas(item, query, next)), bounds);
    if (fit) apply(fit);
  }
  const overviewX = (log: number) => 10 + (log - bounds.min) / (bounds.max - bounds.min) * 980;
  const overviewMin = bounds.min + view.span / 2, overviewMax = bounds.max - view.span / 2;

  return <div className="explorer-shell atlas-workspace" data-ready={ready} data-view-center={view.center} data-view-span={view.span} data-bound-min={bounds.min} data-bound-max={bounds.max} data-lane={lane ?? "all"}>
    <div className="atlas-topbar">
      <nav className="atlas-mode" aria-label="Explorer mode"><span aria-current="page">Atlas <small>2D</small></span><a href={flightUrl}>Flight <small>3D ↗</small></a></nav>
      <p><strong>{items.length}</strong> phenomena · one shared dataset</p>
    </div>
    <div className="explorer-toolbar">
      <div className="search-control"><label htmlFor="explorer-search">Find a phenomenon</label>
        <input id="explorer-search" type="search" placeholder="Try heartbeat, quartz, or a domain…" value={query} autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
        {query.trim() && <div className="search-results" role="region" aria-label="Search results">
          {filtered.length ? filtered.map((item) => <button type="button" key={item.id} onClick={() => focusItem(item.id)}><span>{item.name}</span><small>{item.lane} · {itemCoordinate(item)}</small></button>) : <p>No records match. Clear the search or switch domains.</p>}
        </div>}
      </div>
      <div className="toolbar-actions"><button type="button" onClick={() => apply((v) => zoomView(v, 0.75, 0.5, bounds))}>Zoom in</button><button type="button" onClick={() => apply((v) => zoomView(v, 1.35, 0.5, bounds))}>Zoom out</button><button type="button" onClick={() => apply(fitAll(bounds))}>Fit all</button><button type="button" disabled={!fitResults} onClick={() => fitResults && apply(fitResults)}>Fit results</button></div>
    </div>
    <div className="atlas-domains" role="group" aria-label="Domain focus"><button type="button" aria-pressed={!lane} onClick={() => changeLane(null)}>All domains</button>{availableLanes.map((name) => <button key={name} type="button" aria-pressed={lane === name} style={{ "--lane-color": laneColor(name, lanes) } as CSSProperties} onClick={() => changeLane(name)}><i aria-hidden="true" />{name}</button>)}</div>
    <div className="atlas-main">
      <div className="atlas-chart-column">
        <section className="atlas-overview" aria-label="Full corpus overview">
          <div className="atlas-overview-heading"><span>THE WHOLE ATLAS</span><small>{view.span.toFixed(1)} decades in view</small></div>
          <svg viewBox="0 0 1000 55" aria-hidden="true" preserveAspectRatio="none">
            <rect x="10" y="10" width="980" height="35" rx="5" fill="#eef0e9" />
            {items.map((item) => { const e = extentOf(item); if (!e) return null; const color = item.markKind === "reference" ? "#ac792a" : laneColor(item.lane, lanes); return e.lines.length ? e.lines.map((log) => <line key={`${item.id}:${log}`} x1={overviewX(log)} x2={overviewX(log)} y1="16" y2="39" stroke={color} strokeWidth="2" />) : <rect key={item.id} x={overviewX(e.low)} y={15 + Math.max(0, lanes.indexOf(item.lane)) % 4 * 6} width={Math.max(3, overviewX(e.high) - overviewX(e.low))} height="5" rx="2" fill={color} />; })}
            <rect className="atlas-overview-window" x={overviewX(g.min)} y="5" width={Math.max(1, overviewX(g.max) - overviewX(g.min))} height="45" rx="6" />
          </svg>
          <label className="atlas-overview-control">Move the viewport<input type="range" aria-label="Overview position" min={overviewMin} max={Math.max(overviewMin, overviewMax)} step="any" value={view.center} disabled={overviewMax - overviewMin < 1e-10} aria-valuetext={`${formatCoordinate(view.center)}, center of current view`} onChange={(event) => apply({ ...view, center: Number(event.target.value) })} /></label>
          <div className="atlas-overview-ends"><span>{formatCoordinate(bounds.min)}</span><span>{formatCoordinate(bounds.max)}</span></div>
        </section>
        <div className="atlas-plot-heading"><h2>{lane ?? "Across domains"}</h2><span>{layout.marks.length} in view · {positioned.length} positioned · {filtered.length - positioned.length} unpositioned</span></div>
        <div ref={frameRef} className="canvas-frame" data-testid="explorer-plot">
          <canvas ref={canvasRef} className="frequency-canvas" style={{ height: layout.height }} tabIndex={0} aria-label="Logarithmic frequency explorer. Drag horizontally to pan; wheel or buttons to zoom. Arrow keys pan, plus and minus zoom, Home fits all. Swipe vertically to scroll the page." onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onPointerLeave={() => { if (!drag.current) setHoveredId(null); }} onKeyDown={key} />
          <div className="atlas-lane-headings" aria-hidden="true">{layout.lanes.map((row) => <div key={row.name} style={{ top: row.top + 18, width: g.left - 18, "--lane-color": laneColor(row.name, lanes) } as CSSProperties}><i />{row.name}<small>{row.count} in view</small></div>)}</div>
          <svg className="atlas-leaders" width={width} height={layout.height} aria-hidden="true">{layout.marks.map((mark) => <line key={mark.item.id} x1={clamp(mark.x, mark.labelLeft + 8, mark.labelLeft + mark.labelWidth - 8)} y1={mark.labelTop + 43} x2={mark.x} y2={mark.y - 7} />)}</svg>
          <div className="plot-label-layer" aria-label="Visible phenomenon labels">{layout.marks.map((mark) => <button key={mark.item.id} type="button" data-record-id={mark.item.id} className={`plot-label${mark.item.id === selectedId ? " is-selected" : ""}${mark.item.markKind === "reference" ? " is-reference" : ""}`} style={{ left: mark.labelLeft, top: mark.labelTop, width: mark.labelWidth, "--lane-color": laneColor(mark.item.lane, lanes) } as CSSProperties} onClick={() => setSelectedId(mark.item.id)} onMouseEnter={() => setHoveredId(mark.item.id)} onMouseLeave={() => setHoveredId(null)} onFocus={() => setHoveredId(mark.item.id)} onBlur={() => setHoveredId(null)} title={`${mark.item.name} · ${itemCoordinate(mark.item)}`}><Glyph kind={mark.item.markKind} /><span><strong>{mark.item.name}</strong><small>{itemCoordinate(mark.item)}</small></span></button>)}</div>
          {hoveredMark && <div className="plot-tooltip" role="status" style={{ left: clamp(hoveredMark.labelLeft, 8, Math.max(8, width - 280)), top: Math.min(hoveredMark.y + 14, layout.height - 108), maxWidth: Math.min(272, width - 16) }}><strong>{hoveredMark.item.name}</strong><span>{MARK_LABELS[hoveredMark.item.markKind]} · {hoveredMark.item.lane}</span><small>{itemCoordinate(hoveredMark.item)}</small></div>}
          {!layout.marks.length && <div className="atlas-empty"><h3>{positioned.length ? "An open interval" : "No positioned records"}</h3><p>{positioned.length ? "This window has no plotted marks. Use the overview or fit the current results." : "Unresolved records remain available in the record browser; no frequency is invented."}</p><button type="button" disabled={!fitResults} onClick={() => fitResults && apply(fitResults)}>Return to results</button></div>}
        </div>
        <div className="explorer-footer"><span>{formatCoordinate(g.min)}</span><span>×10 per decade</span><span>{formatCoordinate(g.max)}</span></div>
        <div className="mark-legend" aria-label="Explorer mark legend">{(Object.keys(MARK_LABELS) as MarkKind[]).map((kind) => <span key={kind}><Glyph kind={kind} />{MARK_LABELS[kind]}</span>)}</div>
        <p className="atlas-note">Position is a navigation aid, not proof of a connection. Colors identify domains. Bands show extents, not amplitude or a reconstructed waveform.</p>
        <section className="atlas-catalog" aria-label="Atlas record browser"><div><h2>{query.trim() ? "Matching records" : browseAll ? "Record browser" : "In this window"}</h2><button type="button" onClick={() => setBrowseAll(!browseAll)}>{browseAll ? "Show current window" : "Browse all records"}</button></div>
          <div className="atlas-record-list">{catalog.map((item) => <button key={item.id} type="button" data-record-id={item.id} onClick={() => focusItem(item.id)}><Glyph kind={item.markKind} /><span><strong>{item.name}</strong><small>{item.lane} · {itemCoordinate(item)}</small></span><span aria-hidden="true">↗</span></button>)}</div>
          {!catalog.length && <p>No records here. Browse all records or change the active domain/search.</p>}
          <p className="atlas-note">{filtered.length - positioned.length} unpositioned records in this filter. Browse all records to inspect them.</p>
        </section>
      </div>
      <aside className="explorer-detail atlas-inspector" aria-label="Selected atlas record" data-selected-id={selected?.id ?? ""}>
        {selected ? <>
          <div className="detail-heading"><div><span className="detail-lane">{selected.lane}</span><h2>{selected.name}</h2></div><button type="button" className="icon-button" aria-label="Close detail panel" onClick={() => setSelectedId(null)}>×</button></div>
          <div className="atlas-value"><small>{selected.display?.mode === "claim-reference" ? "REFERENCE COORDINATE" : "DISPLAY COORDINATE"}</small><strong>{itemCoordinate(selected)}</strong></div>
          <p>{selected.summary}</p>
          <button type="button" className="atlas-focus" disabled={!fitSelection} onClick={() => { setQuery(""); setLane(null); if (fitSelection) apply(fitSelection); }}>Fit selection</button>
          <dl className="detail-metadata"><div><dt>Representation</dt><dd>{selected.profileType.replaceAll("_", " ")}</dd></div><div><dt>Native axis</dt><dd>{selected.axisKind.replaceAll("_", " ")}</dd></div><div><dt>Native value</dt><dd>{selected.display?.nativeLabel ?? "Unresolved"}</dd></div><div><dt>Display mapping</dt><dd>{selected.display?.mode ?? "Unpositioned"}</dd></div></dl>
          <p className="atlas-note">{selected.display?.note ?? "No supported quantitative coordinate; this record is not placed on the axis."}</p>
          <FlightEvidence item={selected} />
          {selected.relationships.length > 0 && <section aria-label="Recorded connections"><h3>Recorded connections</h3>{selected.relationships.map((r) => <button className={`atlas-connection is-${r.category}`} type="button" key={r.id} disabled={!byId.has(r.peerId)} onClick={() => focusItem(r.peerId)}><strong>{r.type.replaceAll("_", " ")}</strong><span>{r.direction === "outgoing" ? "→" : "←"} {r.peerName}</span><small>{r.category} · mechanism: {(r.evidence?.mechanism_status ?? "unspecified").replaceAll("_", " ")}</small></button>)}</section>}
          <a className="button primary detail-link" href={`${base}phenomena/${encodeURIComponent(selected.id)}/`}>Open full record</a><a className="atlas-flight-link" href={flightUrl}>Continue in Frequency Flight ↗</a>
        </> : <div className="empty-detail"><span className="detail-lane">THE PRECISE VIEW</span><h2>Find your frequency.</h2><p>Follow a landmark, focus on a domain, or zoom into the space between them.</p><div className="atlas-guide"><strong>01</strong><p>Read the labels.<br /><small>Coincident records get their own rows.</small></p><strong>02</strong><p>Frame a closer view.<br /><small>Use domain focus, fit results, or the overview.</small></p><strong>03</strong><p>Follow the evidence.<br /><small>Original quantities and claim-specific sources stay one click away.</small></p></div><p className="atlas-note">The amber dashed marks are references, not measurements of the phenomenon’s physical spectrum.</p><a className="atlas-flight-link" href={flightUrl}>See this scale in Flight ↗</a></div>}
      </aside>
    </div>
  </div>;
}
