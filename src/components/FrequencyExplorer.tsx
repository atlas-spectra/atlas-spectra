import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import type { ExplorerItem } from "../lib/corpus";

interface Props { items: ExplorerItem[]; lanes: string[]; }
interface ViewState { center: number; span: number; }
interface HitRegion { id: string; x1: number; x2: number; y1: number; y2: number; }

const DEFAULT_VIEW: ViewState = { center: 7.3, span: 16.6 };
const MIN_SPAN = 1.2;
const MAX_SPAN = 22;
const MIN_CENTER = -30;
const MAX_CENTER = 30;
const LEFT_GUTTER = 152;
const TOP_GUTTER = 44;
const BOTTOM_GUTTER = 58;
const LANE_HEIGHT = 66;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function sanitizeView(view: ViewState): ViewState {
  return {
    center: Number.isFinite(view.center) ? clamp(view.center, MIN_CENTER, MAX_CENTER) : DEFAULT_VIEW.center,
    span: Number.isFinite(view.span) && view.span > 0 ? clamp(view.span, MIN_SPAN, MAX_SPAN) : DEFAULT_VIEW.span,
  };
}

function parseUrlNumber(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatHz(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / 10 ** exponent;
  return exponent >= -2 && exponent <= 3
    ? `${Number(value.toPrecision(4))} Hz`
    : `${Number(mantissa.toFixed(2))} × 10^${exponent} Hz`;
}

function formatDisplayCoordinate(item: ExplorerItem): string {
  if (!item.display) return "Unpositioned";
  return item.display.lowHz === item.display.highHz
    ? formatHz(item.display.lowHz)
    : `${formatHz(item.display.lowHz)}–${formatHz(item.display.highHz)}`;
}

function readUrlState() {
  if (typeof window === "undefined") return { view: DEFAULT_VIEW, selectedId: null as string | null };
  const params = new URLSearchParams(window.location.search);
  const center = parseUrlNumber(params.get("center"), DEFAULT_VIEW.center);
  const span = parseUrlNumber(params.get("span"), DEFAULT_VIEW.span);
  return {
    view: sanitizeView({ center, span }),
    selectedId: params.get("entity"),
  };
}

function writeUrlState(view: ViewState, selectedId: string | null) {
  const safeView = sanitizeView(view);
  const url = new URL(window.location.href);
  url.searchParams.set("center", safeView.center.toFixed(3));
  url.searchParams.set("span", safeView.span.toFixed(3));
  selectedId ? url.searchParams.set("entity", selectedId) : url.searchParams.delete("entity");
  history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
}

export default function FrequencyExplorer({ items, lanes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hits = useRef<HitRegion[]>([]);
  const drag = useRef<{ x: number; center: number } | null>(null);
  const initialized = useRef(false);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [size, setSize] = useState({ width: 1200, height: TOP_GUTTER + lanes.length * LANE_HEIGHT + BOTTOM_GUTTER });

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selected = selectedId ? itemById.get(selectedId) ?? null : null;
  const positioned = useMemo(() => items.filter((item) => item.display), [items]);
  const unpositioned = items.length - positioned.length;
  const normalizedQuery = query.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!normalizedQuery) return [];
    return items.filter((item) => [item.name, item.id, item.summary, ...item.domains].some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [items, normalizedQuery]);
  const visible = useMemo(
    () => normalizedQuery ? searchMatches.filter((item) => item.display) : positioned,
    [normalizedQuery, positioned, searchMatches],
  );
  const unpositionedMatches = normalizedQuery ? searchMatches.filter((item) => !item.display).length : 0;

  const selectItem = useCallback((id: string) => {
    setSelectedId(id);
    const item = itemById.get(id);
    if (!item?.display) return;
    const center = (Math.log10(item.display.lowHz) + Math.log10(item.display.highHz)) / 2;
    setView((current) => sanitizeView({ ...current, center }));
  }, [itemById]);

  useEffect(() => {
    const sync = () => {
      const state = readUrlState();
      setView(state.view);
      setSelectedId(state.selectedId);
    };
    sync();
    initialized.current = true;
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (initialized.current) writeUrlState(view, selectedId);
  }, [view, selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => setSize({
      width: Math.max(720, Math.floor(entries[0].contentRect.width)),
      height: TOP_GUTTER + lanes.length * LANE_HEIGHT + BOTTOM_GUTTER,
    }));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [lanes.length]);

  const laneIndex = useMemo(() => new Map(lanes.map((lane, index) => [lane, index])), [lanes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const left = LEFT_GUTTER;
    const right = size.width - 22;
    const width = Math.max(1, right - left);
    const min = view.center - view.span / 2;
    const max = view.center + view.span / 2;
    const x = (log: number) => left + ((log - min) / view.span) * width;

    ctx.fillStyle = "#fbfbfa";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.font = "12px ui-sans-serif,system-ui,sans-serif";
    ctx.textBaseline = "middle";

    const firstDecade = Math.ceil(min);
    const lastDecade = Math.floor(max);
    for (let decade = firstDecade; decade <= lastDecade; decade += 1) {
      const xx = x(decade);
      if (xx < left - 1 || xx > right + 1) continue;
      ctx.strokeStyle = decade === 0 ? "#aaa7a0" : "#e5e3de";
      ctx.lineWidth = decade === 0 ? 1.2 : 1;
      ctx.beginPath();
      ctx.moveTo(xx, TOP_GUTTER - 10);
      ctx.lineTo(xx, size.height - BOTTOM_GUTTER + 10);
      ctx.stroke();
      ctx.fillStyle = "#77736b";
      ctx.textAlign = "center";
      ctx.fillText(`10^${decade}`, xx, size.height - 25);
    }

    lanes.forEach((lane, index) => {
      const y = TOP_GUTTER + index * LANE_HEIGHT;
      ctx.strokeStyle = "#eceae5";
      ctx.beginPath();
      ctx.moveTo(0, y + LANE_HEIGHT);
      ctx.lineTo(size.width, y + LANE_HEIGHT);
      ctx.stroke();
      ctx.fillStyle = "#6c6962";
      ctx.textAlign = "left";
      ctx.fillText(lane, 16, y + LANE_HEIGHT / 2);
    });

    ctx.fillStyle = "#45433f";
    ctx.font = "600 12px ui-sans-serif,system-ui,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Display coordinate", left, 18);
    ctx.textAlign = "right";
    ctx.fillStyle = "#77736b";
    ctx.font = "12px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText("equivalent cycles / second", right, 18);

    const regions: HitRegion[] = [];
    for (const item of visible) {
      if (!item.display) continue;
      const lane = laneIndex.get(item.lane) ?? lanes.length - 1;
      const cy = TOP_GUTTER + lane * LANE_HEIGHT + LANE_HEIGHT / 2;
      const low = Math.log10(item.display.lowHz);
      const high = Math.log10(item.display.highHz);
      if (high < min || low > max) continue;

      const x1 = clamp(x(low), left, right);
      const x2 = clamp(x(high), left, right);
      const isSelected = item.id === selectedId;
      const isReference = item.markKind === "reference";
      const rangedReference = isReference && item.display.lowHz !== item.display.highHz;

      ctx.save();
      ctx.strokeStyle = isSelected ? "#11110f" : isReference ? "#8d8375" : "#4f5652";
      ctx.fillStyle = isSelected ? "#11110f" : "#4f5652";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      if (isReference) ctx.setLineDash([4, 3]);

      if (item.markKind === "point" || (isReference && !rangedReference)) {
        const xx = (x1 + x2) / 2;
        ctx.beginPath();
        ctx.arc(xx, cy, isSelected ? 6 : 4.5, 0, Math.PI * 2);
        isReference ? ctx.stroke() : ctx.fill();
        regions.push({ id: item.id, x1: xx - 10, x2: xx + 10, y1: cy - 12, y2: cy + 12 });
      } else if (rangedReference) {
        const bandWidth = Math.max(3, x2 - x1);
        ctx.globalAlpha = isSelected ? 0.16 : 0.07;
        ctx.fillRect(x1, cy - 7, bandWidth, 14);
        ctx.globalAlpha = 1;
        ctx.strokeRect(x1, cy - 7, bandWidth, 14);
        regions.push({ id: item.id, x1: x1 - 5, x2: x2 + 5, y1: cy - 16, y2: cy + 16 });
      } else if (item.markKind === "lines" && item.display.positionsHz?.length) {
        const xs = item.display.positionsHz.map((value) => x(Math.log10(value))).filter((xx) => xx >= left && xx <= right);
        for (const xx of xs) {
          ctx.beginPath();
          ctx.moveTo(xx, cy - 12);
          ctx.lineTo(xx, cy + 12);
          ctx.stroke();
        }
        regions.push({ id: item.id, x1: Math.max(left, Math.min(...xs, x1) - 8), x2: Math.min(right, Math.max(...xs, x2) + 8), y1: cy - 16, y2: cy + 16 });
      } else {
        const markWidth = Math.max(3, x2 - x1);
        const height = item.markKind === "spectrum" ? 18 : item.markKind === "chirp" ? 14 : 10;
        ctx.globalAlpha = isSelected ? 0.95 : item.markKind === "spectrum" ? 0.28 : 0.62;
        ctx.fillRect(x1, cy - height / 2, markWidth, height);
        ctx.globalAlpha = 1;
        if (item.markKind === "chirp") {
          ctx.beginPath();
          ctx.moveTo(x1, cy + 7);
          ctx.lineTo(x2, cy - 7);
          ctx.stroke();
        }
        regions.push({ id: item.id, x1: x1 - 5, x2: x2 + 5, y1: cy - 16, y2: cy + 16 });
      }

      if (view.span < 11 || isSelected) {
        ctx.setLineDash([]);
        ctx.fillStyle = isSelected ? "#11110f" : "#605d57";
        ctx.font = isSelected ? "600 11px ui-sans-serif,system-ui,sans-serif" : "11px ui-sans-serif,system-ui,sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(item.name, Math.min(right - 6, Math.max(left + 6, x2 + 7)), cy - 16);
      }
      ctx.restore();
    }
    hits.current = regions;
  }, [laneIndex, lanes, selectedId, size, view, visible]);

  const selectAt = useCallback((x: number, y: number) => {
    const hit = [...hits.current].reverse().find((region) => x >= region.x1 && x <= region.x2 && y >= region.y1 && y <= region.y2);
    hit ? selectItem(hit.id) : setSelectedId(null);
  }, [selectItem]);

  function wheel(event: WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const plotWidth = Math.max(1, rect.width - LEFT_GUTTER - 22);
    const ratio = clamp((event.clientX - rect.left - LEFT_GUTTER) / plotWidth, 0, 1);
    const min = view.center - view.span / 2;
    const anchor = min + ratio * view.span;
    const newSpan = clamp(view.span * Math.exp(event.deltaY * 0.0012), MIN_SPAN, MAX_SPAN);
    const newMin = anchor - ratio * newSpan;
    setView(sanitizeView({ center: newMin + newSpan / 2, span: newSpan }));
  }

  function down(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, center: view.center };
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const plotWidth = Math.max(1, rect.width - LEFT_GUTTER - 22);
    const delta = ((event.clientX - drag.current.x) / plotWidth) * view.span;
    setView((current) => sanitizeView({ ...current, center: drag.current!.center - delta }));
  }

  function up(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    if (Math.abs(event.clientX - start.x) < 4) {
      const rect = event.currentTarget.getBoundingClientRect();
      selectAt(event.clientX - rect.left, event.clientY - rect.top);
    }
  }

  function key(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setView((current) => sanitizeView({ ...current, center: current.center + direction * current.span * 0.08 }));
    }
    if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      const factor = event.key === "-" ? 1.25 : 0.8;
      setView((current) => sanitizeView({ ...current, span: current.span * factor }));
    }
  }

  const countLabel = normalizedQuery
    ? `${visible.length} plotted · ${unpositionedMatches} unpositioned matches`
    : `${positioned.length} plotted · ${unpositioned} unpositioned`;

  return <div className="explorer-shell">
    <div className="explorer-toolbar">
      <div className="search-control">
        <label htmlFor="explorer-search"><span>Find</span></label>
        <input id="explorer-search" type="search" placeholder="heart, quartz, optical…" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
        {normalizedQuery && <div className="search-results" aria-label="Search results">
          {searchMatches.length ? searchMatches.slice(0, 12).map((item) => <button key={item.id} type="button" onClick={() => { selectItem(item.id); setQuery(""); }}>
            <span>{item.name}</span>
            <small>{item.display ? `${item.lane} · plotted` : `${item.lane} · unpositioned`}</small>
          </button>) : <p>No Atlas records match this search.</p>}
          {searchMatches.length > 12 && <p>{searchMatches.length - 12} more matches — narrow the search to select one.</p>}
        </div>}
      </div>
      <div className="toolbar-actions">
        <button type="button" onClick={() => setView((current) => sanitizeView({ ...current, span: current.span * 0.75 }))}>Zoom in</button>
        <button type="button" onClick={() => setView((current) => sanitizeView({ ...current, span: current.span * 1.35 }))}>Zoom out</button>
        <button type="button" onClick={() => setView(DEFAULT_VIEW)}>Reset</button>
      </div>
      <div className="explorer-count">{countLabel}</div>
    </div>
    <div className="canvas-frame">
      <canvas ref={canvasRef} className="frequency-canvas" aria-label="Logarithmic frequency explorer. Drag to pan, use the mouse wheel or zoom buttons to zoom, and click a mark to inspect it." tabIndex={0} onWheel={wheel} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }} onKeyDown={key} />
    </div>
    <div className="explorer-footer"><span>{formatHz(10 ** (view.center - view.span / 2))}</span><span>{view.span.toFixed(1)} decades visible</span><span>{formatHz(10 ** (view.center + view.span / 2))}</span></div>
    <div className="explorer-detail" aria-live="polite">{selected ? <>
      <div className="detail-heading"><div><span className="detail-lane">{selected.lane}</span><h2>{selected.name}</h2></div><button type="button" className="icon-button" onClick={() => setSelectedId(null)} aria-label="Close detail panel">×</button></div>
      <p>{selected.summary}</p>
      <dl className="detail-metadata">
        <div><dt>Representation</dt><dd>{selected.profileType.replaceAll("_", " ")}</dd></div>
        <div><dt>Native axis</dt><dd>{selected.axisKind.replaceAll("_", " ")}</dd></div>
        <div><dt>Native value</dt><dd>{selected.display?.nativeLabel ?? "Unresolved"}</dd></div>
        <div><dt>Display coordinate</dt><dd>{formatDisplayCoordinate(selected)}</dd></div>
        <div><dt>Explorer mapping</dt><dd>{selected.display?.note ?? "No quantitative display coordinate"}</dd></div>
      </dl>
      {selected.relationships.length > 0 && <div className="detail-section"><h3>Relationships</h3><div className="relationship-chips">{selected.relationships.slice(0, 8).map((relationship) => <span key={relationship.id} className={`chip chip-${relationship.category}`}>{relationship.type.replaceAll("_", " ")}<small> {relationship.direction === "outgoing" ? "→" : "←"} {relationship.peerName}</small></span>)}</div></div>}
      <div className="detail-section evidence-summary"><h3>Evidence</h3>{selected.provenance.length ? <p>{selected.provenance[0].evidence.basis?.replaceAll("_", " ")} · {selected.provenance[0].evidence.review_status?.replaceAll("_", " ")}</p> : <p>See relationship or claim evidence in the full record.</p>}</div>
      <a className="button primary detail-link" href={`../phenomena/${selected.id}/`}>Open full record</a>
    </> : <div className="empty-detail"><span className="detail-lane">Inspect</span><h2>Select a phenomenon</h2><p>The plot separates display position from scientific relationship. Search also exposes records that cannot be placed on the shared display coordinate.</p></div>}</div>
    <div className="sr-only"><p>Atlas phenomena:</p><ul>{items.map((item) => <li key={item.id}><button type="button" onClick={() => selectItem(item.id)}>{item.name}{item.display ? "" : " (unpositioned)"}</button></li>)}</ul></div>
  </div>;
}
