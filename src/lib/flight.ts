import type { ExplorerItem, MarkKind } from "./corpus";

/** Rendering coordinates only. These never become scientific claims. */
export interface FlightBounds { min: number; max: number }
export interface FlightRecord {
  id: string; name: string; lane: string; kind: MarkKind;
  low: number; high: number; lines: number[]; x: number; y: number;
}
export interface FlightModel {
  records: FlightRecord[];
  unpositionedIds: string[];
  bounds: FlightBounds;
  start: number;
}
export interface FlightLabel {
  record: FlightRecord;
  /** Exact coordinate of the rendered anchor, including later spectral lines. */
  coordinate: number;
  anchorX: number; anchorY: number;
  left: number; top: number; width: number; height: number;
}
export interface FlightLabelPlan {
  labels: FlightLabel[];
  /** Projected anchors eligible for labels, not a count of independent measurements. */
  eligibleCount: number;
  candidateCount: number;
}

export const DEPTH_PER_DECADE = 18;
export const FLIGHT_FOV = 55;
export const SCROLL_PER_DECADE = 420;
export const FLIGHT_LABEL_HEIGHT = 88;
export const FLIGHT_LABEL_TOP = 134;
export const FLIGHT_LABEL_BOTTOM = 42;
export const FLIGHT_LABEL_CANDIDATES = 64;
const positive = (n: number) => Number.isFinite(n) && n > 0;
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function buildFlightModel(items: ExplorerItem[], lanes: string[]): FlightModel {
  const records: FlightRecord[] = [];
  const unpositionedIds: string[] = [];
  const laneCounts = new Map<string, number>();
  for (const item of [...items].sort((a, b) => a.id.localeCompare(b.id))) {
    const d = item.display;
    if (!d || !positive(d.lowHz) || !positive(d.highHz) || d.highHz < d.lowHz) {
      unpositionedIds.push(item.id); continue;
    }
    const lines = item.markKind === "lines"
      ? [...new Set((d.positionsHz ?? []).filter(positive).map(Math.log10))].sort((a, b) => a - b) : [];
    if (item.markKind === "lines" && !lines.length) { unpositionedIds.push(item.id); continue; }
    const lane = Math.max(0, lanes.indexOf(item.lane));
    const ordinal = laneCounts.get(item.lane) ?? 0;
    laneCounts.set(item.lane, ordinal + 1);
    records.push({
      id: item.id, name: item.name, lane: item.lane, kind: item.markKind,
      low: lines.length ? lines[0] : Math.log10(d.lowHz),
      high: lines.length ? lines[lines.length - 1] : Math.log10(d.highHz), lines,
      // Editorial lane spacing, not additional physical quantities.
      x: (lane % 2 === 0 ? -3.3 : 3.3) + ((ordinal % 3) - 1) * 0.35,
      y: (Math.ceil(lanes.length / 2) / 2 - 0.5 - Math.floor(lane / 2)) * 1.5,
    });
  }
  if (!records.length) return { records, unpositionedIds, bounds: { min: -1, max: 1 }, start: 0 };
  const low = records.reduce((min, r) => Math.min(min, r.low), Infinity);
  const high = records.reduce((max, r) => Math.max(max, r.high), -Infinity);
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
/** Search selects the nearest actual line; an explicit label anchor wins. */
export function recordCoordinate(record: FlightRecord, near = record.low): number {
  return record.lines.length ? anchorLog(record, Number.isFinite(near) ? near : record.low) : (record.low + record.high) / 2;
}
export function landmarkCoordinates(model: FlightModel): number[] {
  return [...new Set(model.records.flatMap((record) =>
    record.lines.length ? record.lines : [recordCoordinate(record)]))].sort((a, b) => a - b);
}
export function adjacentLandmarks(stops: number[], at: number) {
  return { previous: [...stops].reverse().find((stop) => stop < at), next: stops.find((stop) => stop > at) };
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
  if (![x, y, log, at, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const depth = cameraDistance(width / height) + (log - at) * DEPTH_PER_DECADE;
  if (depth < 1.5 || depth > 115) return null;
  const scale = height / (2 * Math.tan(FLIGHT_FOV * Math.PI / 360) * depth);
  return { x: width / 2 + x * scale, y: height / 2 - y * scale };
}

/** Logical label-depth window. Lateral clipping and collisions can hide labels within it. */
export function flightDepthWindow(model: FlightModel, at: number, width: number, height: number): FlightBounds {
  const center = boundedCoordinate(at, model.bounds);
  if (!positive(width) || !positive(height)) return { min: center, max: center };
  const distance = cameraDistance(width / height);
  return {
    min: Math.max(model.bounds.min, center - 4, center + (1.5 - distance) / DEPTH_PER_DECADE),
    max: Math.min(model.bounds.max, center + 4, center + (115 - distance) / DEPTH_PER_DECADE),
  };
}
export function flightRecordLocation(record: FlightRecord | undefined, _at: number, window: FlightBounds, labeledIds: Set<string>): string {
  if (!record) return "Unpositioned";
  if (labeledIds.has(record.id)) return "Labeled in view";
  if (record.high < window.min) return "Behind this depth window";
  if (record.low > window.max) return "Ahead of this depth window";
  // A line envelope can intersect the window while every actual line lies outside it.
  if (record.lines.length && !record.lines.some((line) => line >= window.min && line <= window.max)) return "Between spectral lines · not labeled";
  return "In depth window · not labeled";
}

/** Bounded candidate pool, fixed label rectangles, no relocation of scientific anchors. */
export function planFlightLabels(model: FlightModel, at: number, width: number, height: number, selectedId: string | null): FlightLabelPlan {
  const empty: FlightLabelPlan = { labels: [], eligibleCount: 0, candidateCount: 0 };
  if (![at, width, height].every(Number.isFinite) || width < 120 || height < FLIGHT_LABEL_TOP + FLIGHT_LABEL_HEIGHT + FLIGHT_LABEL_BOTTOM) return empty;
  const labelWidth = Math.min(width < 600 ? 164 : 224, width - 24);
  const limit = width < 600 ? 4 : 7;
  type Candidate = { record: FlightRecord; coordinate: number; x: number; y: number; distance: number; priority: number };
  const candidates: Candidate[] = [];
  let eligibleCount = 0;
  const compare = (a: Candidate, b: Candidate) => a.priority - b.priority || a.distance - b.distance || a.record.id.localeCompare(b.record.id);
  for (const record of model.records) {
    let candidate: Candidate | null = null;
    // Choose the nearest VISIBLE real line. A nearer line behind the camera must
    // not suppress a later line that is actually visible. One label per record.
    for (const coordinate of record.lines.length ? record.lines : [anchorLog(record, at)]) {
      const distance = Math.abs(coordinate - at);
      if (distance > 4) continue;
      const p = projectPoint(record.x, record.y, coordinate, at, width, height);
      if (!p || p.x < 8 || p.x > width - 8 || p.y < 60 || p.y > height - 45) continue;
      if (!candidate || distance < candidate.distance || (distance === candidate.distance && coordinate < candidate.coordinate)) {
        candidate = { record, coordinate, x: p.x, y: p.y, distance, priority: record.id === selectedId ? 0 : 1 };
      }
    }
    if (!candidate) continue;
    eligibleCount += 1;
    if (candidates.length === FLIGHT_LABEL_CANDIDATES && compare(candidate, candidates[candidates.length - 1]) >= 0) continue;
    let lo = 0, hi = candidates.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (compare(candidates[mid], candidate) <= 0) lo = mid + 1; else hi = mid; }
    candidates.splice(lo, 0, candidate);
    if (candidates.length > FLIGHT_LABEL_CANDIDATES) candidates.pop();
  }
  const labels: FlightLabel[] = [];
  const maxTop = height - FLIGHT_LABEL_BOTTOM - FLIGHT_LABEL_HEIGHT;
  for (const candidate of candidates) {
    const outward = candidate.record.x < 0 ? candidate.x - labelWidth - 12 : candidate.x + 12;
    const inward = candidate.record.x < 0 ? candidate.x + 12 : candidate.x - labelWidth - 12;
    let placed = false;
    for (const x of [outward, inward, width / 2 - labelWidth / 2]) {
      const left = clamp(x, 10, width - labelWidth - 10);
      for (const offset of [0, -1, 1, -2, 2, -3, 3]) {
        const top = clamp(candidate.y - FLIGHT_LABEL_HEIGHT / 2 + offset * (FLIGHT_LABEL_HEIGHT + 8), FLIGHT_LABEL_TOP, maxTop);
        const collides = labels.some((other) => left < other.left + other.width + 8 && left + labelWidth + 8 > other.left
          && top < other.top + other.height + 8 && top + FLIGHT_LABEL_HEIGHT + 8 > other.top);
        if (collides) continue;
        labels.push({ record: candidate.record, coordinate: candidate.coordinate, anchorX: candidate.x, anchorY: candidate.y,
          left, top, width: labelWidth, height: FLIGHT_LABEL_HEIGHT });
        placed = true; break;
      }
      if (placed) break;
    }
    if (labels.length >= limit) break;
  }
  return { labels, eligibleCount, candidateCount: candidates.length };
}
export function layoutFlightLabels(model: FlightModel, at: number, width: number, height: number, selectedId: string | null): FlightLabel[] {
  return planFlightLabels(model, at, width, height, selectedId).labels;
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
