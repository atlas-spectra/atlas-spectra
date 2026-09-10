import type { ExplorerItem, MarkKind } from "./corpus";

/** Rendering coordinates only. These never become scientific claims. */
export interface FlightBounds { min: number; max: number }
export interface FlightRecord {
  id: string;
  name: string;
  lane: string;
  kind: MarkKind;
  low: number;
  high: number;
  lines: number[];
  x: number;
  y: number;
}
export interface FlightModel {
  records: FlightRecord[];
  unpositionedIds: string[];
  bounds: FlightBounds;
  start: number;
}
export interface FlightLabel {
  record: FlightRecord;
  anchorX: number;
  anchorY: number;
  left: number;
  top: number;
  width: number;
}

export const DEPTH_PER_DECADE = 18;
export const FLIGHT_FOV = 55;
export const SCROLL_PER_DECADE = 420;
const positive = (n: number) => Number.isFinite(n) && n > 0;
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function buildFlightModel(items: ExplorerItem[], lanes: string[]): FlightModel {
  const records: FlightRecord[] = [];
  const unpositionedIds: string[] = [];
  const laneCounts = new Map<string, number>();
  // IDs make local offsets stable across corpus input ordering.
  for (const item of [...items].sort((a, b) => a.id.localeCompare(b.id))) {
    const d = item.display;
    if (!d || !positive(d.lowHz) || !positive(d.highHz) || d.highHz < d.lowHz) {
      unpositionedIds.push(item.id);
      continue;
    }
    const lines = item.markKind === "lines"
      ? [...new Set((d.positionsHz ?? []).filter(positive).map(Math.log10))].sort((a, b) => a - b)
      : [];
    // An envelope around a missing line list is not a real spectral line.
    if (item.markKind === "lines" && !lines.length) {
      unpositionedIds.push(item.id);
      continue;
    }
    const lane = Math.max(0, lanes.indexOf(item.lane));
    const ordinal = laneCounts.get(item.lane) ?? 0;
    laneCounts.set(item.lane, ordinal + 1);
    records.push({
      id: item.id, name: item.name, lane: item.lane, kind: item.markKind,
      low: lines.length ? lines[0] : Math.log10(d.lowHz),
      high: lines.length ? lines[lines.length - 1] : Math.log10(d.highHz),
      lines,
      // Two organized columns, five rows for the current domain vocabulary.
      // Lateral distances are editorial spacing, not measured quantities.
      x: (lane % 2 === 0 ? -3.3 : 3.3) + ((ordinal % 3) - 1) * 0.35,
      y: (Math.ceil(lanes.length / 2) / 2 - 0.5 - Math.floor(lane / 2)) * 1.5,
    });
  }
  if (!records.length) return { records, unpositionedIds, bounds: { min: -1, max: 1 }, start: 0 };
  const low = Math.min(...records.map((r) => r.low));
  const high = Math.max(...records.map((r) => r.high));
  return { records, unpositionedIds, bounds: { min: low - 0.5, max: high + 0.5 }, start: low };
}

export function boundedCoordinate(value: number, bounds: FlightBounds): number {
  return clamp(Number.isFinite(value) ? value : bounds.min, bounds.min, bounds.max);
}

export function parseCoordinate(raw: string | null, model: FlightModel): number {
  const n = raw === null || raw.trim() === "" ? model.start : Number(raw);
  return boundedCoordinate(Number.isFinite(n) ? n : model.start, model.bounds);
}

/** A range label follows its visible extent; lines anchor only to an actual line. */
export function anchorLog(record: FlightRecord, at: number): number {
  if (record.lines.length) return record.lines.reduce((best, value) =>
    Math.abs(value - at) < Math.abs(best - at) ? value : best, record.lines[0]);
  return clamp(at, record.low, record.high);
}

export function recordCoordinate(record: FlightRecord): number {
  return record.lines.length ? record.lines[0] : (record.low + record.high) / 2;
}

export function nearbyRecords(model: FlightModel, at: number): FlightRecord[] {
  return [...model.records].sort((a, b) =>
    Math.abs(anchorLog(a, at) - at) - Math.abs(anchorLog(b, at) - at) || a.id.localeCompare(b.id));
}

export function cameraDistance(aspect: number): number {
  return 18 / Math.min(1, Math.max(0.25, aspect));
}

/** Mirrors the fixed, forward-facing Three.js perspective camera. */
export function projectPoint(x: number, y: number, log: number, at: number, width: number, height: number) {
  if (width <= 0 || height <= 0) return null;
  const depth = cameraDistance(width / height) + (log - at) * DEPTH_PER_DECADE;
  if (depth < 1.5 || depth > 115) return null;
  const scale = height / (2 * Math.tan(FLIGHT_FOV * Math.PI / 360) * depth);
  return { x: width / 2 + x * scale, y: height / 2 - y * scale };
}

export function layoutFlightLabels(model: FlightModel, at: number, width: number, height: number, selectedId: string | null): FlightLabel[] {
  const labelWidth = Math.min(width < 600 ? 156 : 210, Math.max(80, width - 24));
  const candidates = nearbyRecords(model, at).sort((a, b) =>
    Number(b.id === selectedId) - Number(a.id === selectedId));
  const result: FlightLabel[] = [];
  for (const record of candidates) {
    const log = anchorLog(record, at);
    if (Math.abs(log - at) > 4) continue;
    const p = projectPoint(record.x, record.y, log, at, width, height);
    if (!p || p.x < 8 || p.x > width - 8 || p.y < 60 || p.y > height - 45) continue;
    const left = clamp(p.x + (record.x < 0 ? -labelWidth - 12 : 12), 10, width - labelWidth - 10);
    const top = clamp(p.y - 22, 85, height - 72);
    if (result.some((other) => left < other.left + other.width + 10 && left + labelWidth + 10 > other.left && top < other.top + 64 && top + 64 > other.top)) continue;
    result.push({ record, anchorX: p.x, anchorY: p.y, left, top, width: labelWidth });
    if (result.length >= (width < 600 ? 4 : 7)) break;
  }
  return result;
}

export function formatFlightHz(log: number): string {
  if (!Number.isFinite(log)) return "Unpositioned";
  if (log < -3 || log > 12) return `10^${Number(log.toFixed(2))} Hz`;
  const value = 10 ** log;
  const units: [number, string][] = [[1e12, "THz"], [1e9, "GHz"], [1e6, "MHz"], [1e3, "kHz"], [1, "Hz"], [1e-3, "mHz"]];
  const [scale, unit] = units.find(([threshold]) => value >= threshold) ?? units[units.length - 1];
  return `${Number((value / scale).toPrecision(3))} ${unit}`;
}

export const MARK_NAMES: Record<MarkKind, string> = {
  point: "Point", band: "Range", lines: "Discrete lines", spectrum: "Spectrum extent",
  chirp: "Time-varying extent", reference: "Claim reference",
};
