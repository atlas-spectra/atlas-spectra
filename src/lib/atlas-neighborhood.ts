import type { ExplorerItem } from "./corpus";
import { clamp, extentOf, type AtlasView } from "./atlas-view";

export interface Neighbor {
  item: ExplorerItem;
  coordinate: number;
  distance: number;
  relation: "within" | "same" | "lower" | "higher";
}

/** Compare display coordinates, never physical mechanisms or signal similarity. */
export function neighborAt(item: ExplorerItem, at: number): Neighbor | null {
  const extent = extentOf(item);
  if (!extent || !Number.isFinite(at)) return null;
  const coordinate = extent.lines.length
    ? extent.lines.reduce((best, value) => Math.abs(value - at) < Math.abs(best - at) ? value : best, extent.lines[0])
    : clamp(at, extent.low, extent.high);
  const within = !extent.lines.length && extent.low !== extent.high && at >= extent.low && at <= extent.high;
  return { item, coordinate, distance: Math.abs(coordinate - at), relation: within ? "within" : coordinate === at ? "same" : coordinate < at ? "lower" : "higher" };
}
export function neighborsAt(items: ExplorerItem[], at: number): Neighbor[] {
  return items.map((item) => neighborAt(item, at)).filter((entry): entry is Neighbor => entry !== null)
    .sort((a, b) => a.distance - b.distance || a.item.id.localeCompare(b.item.id));
}
export function distanceLabel(entry: Neighbor): string {
  if (entry.relation === "within") return "Inside this declared extent";
  if (entry.relation === "same") return "Same display coordinate";
  const factor = entry.distance < 6 ? `${Number((10 ** entry.distance).toPrecision(3))}×` : `10^${Number(entry.distance.toFixed(2))}×`;
  return `${factor} ${entry.relation} on the display scale`;
}
/** A mathematical ruler, explicitly conditional on periodicity, not a measured period. */
export function reciprocalLabel(at: number): string {
  if (!Number.isFinite(at)) return "Unresolved";
  const seconds = 10 ** -at;
  const units: [number, string][] = [[1, "s"], [1e-3, "ms"], [1e-6, "µs"], [1e-9, "ns"], [1e-12, "ps"], [1e-15, "fs"]];
  if (!Number.isFinite(seconds) || seconds === 0 || seconds >= 1e6 || seconds < 1e-15) return `10^${Number((-at).toFixed(2))} s`;
  const [unit, name] = units.find(([threshold]) => seconds >= threshold) ?? units[units.length - 1];
  return `${Number((seconds / unit).toPrecision(3))} ${name}`;
}
export function isInView(item: ExplorerItem, view: AtlasView): boolean {
  const e = extentOf(item);
  if (!e) return false;
  const low = view.center - view.span / 2, high = view.center + view.span / 2;
  return e.lines.length ? e.lines.some((line) => line >= low && line <= high) : e.high >= low && e.low <= high;
}

// Editorial navigation only: every coordinate and description comes from its record.
const LANDMARKS = [
  ["biology.heart.resting-adult-rate", "Heartbeats", "♥"],
  ["neuroscience.eeg.alpha-band", "EEG alpha", "∿"],
  ["acoustics.standard-pitch.a4-440hz", "A4 tone", "♪"],
  ["timekeeping.quartz-wristwatch.resonance", "Quartz", "◷"],
  ["atomic.cesium-133.hyperfine-transition", "Atomic time", "⊙"],
  ["molecular.carbon-dioxide.bending-mode", "Molecules", "⋮"],
  ["vision.cie-2006.lms-cone-fundamentals-2deg", "Optical response", "◉"],
] as const;
export function atlasLandmarks(items: ExplorerItem[]) {
  return LANDMARKS.flatMap(([id, label, glyph]) => {
    const item = items.find((candidate) => candidate.id === id), e = item && extentOf(item);
    if (!item || !e) return [];
    return [{ item, label, glyph, coordinate: e.lines.length ? e.lines[0] : (e.low + e.high) / 2 }];
  }).sort((a, b) => a.coordinate - b.coordinate);
}
export function coordinateStops(items: ExplorerItem[]): number[] {
  return [...new Set(items.flatMap((item) => {
    const e = extentOf(item);
    return e ? e.lines.length ? e.lines : [(e.low + e.high) / 2] : [];
  }))].sort((a, b) => a - b);
}
export function neighboringStops(items: ExplorerItem[], at: number) {
  const stops = coordinateStops(items);
  return { previous: [...stops].reverse().find((log) => log < at), next: stops.find((log) => log > at) };
}
