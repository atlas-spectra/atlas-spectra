import type { ExplorerItem, MarkKind } from "./corpus";

export interface AtlasView { center: number; span: number }
export interface AtlasBounds { min: number; max: number }
export interface AtlasExtent { low: number; high: number; lines: number[] }
export const MIN_SPAN = 1.2;
export const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const positive = (n: number) => Number.isFinite(n) && n > 0;

/** The shared adapter owns scientific conversions. This layer only lays out its coordinates. */
export function extentOf(item: ExplorerItem): AtlasExtent | null {
  const d = item.display;
  if (!d) return null;
  if (item.markKind === "lines") {
    const lines = [...new Set((d.positionsHz ?? []).filter(positive).map(Math.log10))].sort((a, b) => a - b);
    return lines.length ? { low: lines[0], high: lines[lines.length - 1], lines } : null;
  }
  if (!positive(d.lowHz) || !positive(d.highHz) || d.highHz < d.lowHz) return null;
  return { low: Math.log10(d.lowHz), high: Math.log10(d.highHz), lines: [] };
}

export function atlasBounds(items: ExplorerItem[]): AtlasBounds {
  const extents = items.map(extentOf).filter((e): e is AtlasExtent => e !== null);
  if (!extents.length) return { min: -1, max: 1 };
  // 0.65 on either side also gives a single-coordinate corpus a usable minimum span.
  return { min: Math.min(...extents.map((e) => e.low)) - 0.65, max: Math.max(...extents.map((e) => e.high)) + 0.65 };
}
export function fitAll(bounds: AtlasBounds): AtlasView {
  return { center: (bounds.min + bounds.max) / 2, span: bounds.max - bounds.min };
}
export function boundView(view: AtlasView, bounds: AtlasBounds): AtlasView {
  const available = bounds.max - bounds.min;
  const span = Number.isFinite(view.span) && view.span > 0 ? clamp(view.span, Math.min(MIN_SPAN, available), available) : available;
  const center = Number.isFinite(view.center) ? view.center : (bounds.min + bounds.max) / 2;
  return { center: clamp(center, bounds.min + span / 2, bounds.max - span / 2), span };
}
export function fitItems(items: ExplorerItem[], bounds: AtlasBounds): AtlasView | null {
  const extents = items.map(extentOf).filter((e): e is AtlasExtent => e !== null);
  if (!extents.length) return null;
  const low = Math.min(...extents.map((e) => e.low));
  const high = Math.max(...extents.map((e) => e.high));
  return boundView({ center: (low + high) / 2, span: Math.max(MIN_SPAN, high - low + 0.9) }, bounds);
}
export function zoomView(view: AtlasView, factor: number, ratio: number, bounds: AtlasBounds): AtlasView {
  const span = boundView({ ...view, span: view.span * factor }, bounds).span;
  const anchor = view.center + (clamp(ratio, 0, 1) - 0.5) * view.span;
  return boundView({ center: anchor + (0.5 - clamp(ratio, 0, 1)) * span, span }, bounds);
}
export function readAtlasState(search: string, bounds: AtlasBounds, items: ExplorerItem[], lanes: string[]) {
  const params = new URLSearchParams(search);
  const fallback = fitAll(bounds);
  const number = (key: string, otherwise: number) => {
    const value = params.get(key);
    if (value === null || value.trim() === "") return otherwise;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : otherwise;
  };
  const entity = params.get("entity");
  const lane = params.get("lane");
  return {
    view: boundView({ center: number("center", fallback.center), span: number("span", fallback.span) }, bounds),
    selectedId: items.some((item) => item.id === entity) ? entity : null,
    lane: lane && lanes.includes(lane) ? lane : null,
  };
}
export function matchesAtlas(item: ExplorerItem, query: string, lane: string | null): boolean {
  return (!lane || item.lane === lane) && [item.name, item.id, item.summary, item.lane, ...item.domains].join(" ").toLowerCase().includes(query.trim().toLowerCase());
}
export function formatCoordinate(log: number): string {
  if (!Number.isFinite(log)) return "Unpositioned";
  if (log < -3 || log >= 15) return `10^${Number(log.toFixed(2))} Hz`;
  const value = 10 ** log;
  const units: [number, string][] = [[12, "THz"], [9, "GHz"], [6, "MHz"], [3, "kHz"], [0, "Hz"], [-3, "mHz"]];
  const [power, unit] = units.find(([power]) => log >= power - 1e-12) ?? units[units.length - 1];
  return `${Number((value / 10 ** power).toPrecision(4))} ${unit}`;
}
export function itemCoordinate(item: ExplorerItem): string {
  const e = extentOf(item);
  if (!e) return "Unpositioned";
  return e.low === e.high ? formatCoordinate(e.low) : `${formatCoordinate(e.low)} – ${formatCoordinate(e.high)}`;
}
export function geometryFor(width: number, view: AtlasView) {
  const left = width < 600 ? 88 : 150;
  const right = Math.max(left + 1, width - 18);
  const min = view.center - view.span / 2;
  const max = view.center + view.span / 2;
  return { left, right, min, max, width: right - left, x: (log: number) => left + (log - min) / view.span * (right - left) };
}
export interface AtlasMark {
  item: ExplorerItem; extent: AtlasExtent; anchor: number;
  x1: number; x2: number; xs: number[]; x: number; y: number;
  labelLeft: number; labelTop: number; labelWidth: number;
}
export interface AtlasLane { name: string; top: number; height: number; count: number }
export interface AtlasLayout { marks: AtlasMark[]; lanes: AtlasLane[]; height: number }

/** Pack real label rectangles AND mark extents into separate rows; never invent x positions. */
export function layoutAtlas(items: ExplorerItem[], lanes: string[], view: AtlasView, width: number): AtlasLayout {
  const g = geometryFor(width, view);
  const labelWidth = Math.min(214, Math.max(70, g.width - 12));
  const marks: AtlasMark[] = [];
  const rows: AtlasLane[] = [];
  let top = 42;
  for (const name of lanes) {
    const members = items.filter((item) => item.lane === name && extentOf(item));
    if (!members.length) continue;
    const occupied: Array<Array<[number, number]>> = [];
    const visible = members.flatMap((item) => {
      const extent = extentOf(item)!;
      const lines = extent.lines.filter((log) => log >= g.min && log <= g.max);
      if (extent.high < g.min || extent.low > g.max || (extent.lines.length && !lines.length)) return [];
      // A line label points to one real line, never their empty midpoint.
      const anchor = lines.length ? lines.reduce((best, log) => Math.abs(log - view.center) < Math.abs(best - view.center) ? log : best, lines[0]) : clamp((extent.low + extent.high) / 2, g.min, g.max);
      return [{ item, extent, lines, anchor }];
    }).sort((a, b) => a.anchor - b.anchor || a.item.id.localeCompare(b.item.id));
    for (const { item, extent, lines, anchor } of visible) {
      const x = g.x(anchor);
      const x1 = g.x(Math.max(extent.low, g.min));
      const x2 = g.x(Math.min(extent.high, g.max));
      const labelLeft = clamp(x - labelWidth / 2, g.left + 6, g.right - labelWidth - 6);
      const low = Math.min(labelLeft, x1) - 8;
      const high = Math.max(labelLeft + labelWidth, x2) + 8;
      let row = occupied.findIndex((intervals) => intervals.every(([a, b]) => high <= a || low >= b));
      if (row < 0) { row = occupied.length; occupied.push([]); }
      occupied[row].push([low, high]);
      const labelTop = top + 12 + row * 68;
      marks.push({ item, extent, anchor, x1, x2, xs: lines.map(g.x), x, y: labelTop + 53, labelLeft, labelTop, labelWidth });
    }
    const height = Math.max(1, occupied.length) * 68 + 20;
    rows.push({ name, top, height, count: visible.length });
    top += height;
  }
  return { marks, lanes: rows, height: Math.max(230, top + 50) };
}
/** Gaps between discrete lines are not clickable. */
export function hitAtlas(mark: AtlasMark, x: number, y: number): boolean {
  if (Math.abs(y - mark.y) > 10) return false;
  return mark.extent.lines.length ? mark.xs.some((at) => Math.abs(at - x) <= 7) : x >= mark.x1 - 7 && x <= mark.x2 + 7;
}
export const MARK_LABELS: Record<MarkKind, string> = { point: "Point", band: "Band", lines: "Discrete lines", spectrum: "Spectrum extent", chirp: "Time-varying extent", reference: "Claim reference" };
// Categorical accents only, not wavelength/color or evidence mappings.
const COLORS = ["#5c7378", "#367b6d", "#84649a", "#467da7", "#a37440", "#66749b", "#887895", "#657c56", "#777386", "#747571"];
export function laneColor(lane: string, lanes: string[]): string { return COLORS[Math.max(0, lanes.indexOf(lane)) % COLORS.length]; }
