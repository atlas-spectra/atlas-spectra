import { formatCoordinate, type AtlasView } from "./atlas-view";

/** Decade step depends on available pixels even at close zoom. */
export function atlasAxisTicks(view: AtlasView, plotWidth: number): Array<{ log: number; label: string }> {
  if (!Number.isFinite(view.center) || !Number.isFinite(view.span) || view.span <= 0 || !Number.isFinite(plotWidth) || plotWidth <= 0) return [];
  const raw = view.span / Math.max(1, plotWidth / 96);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = magnitude * ([1, 2, 5, 10].find((factor) => factor * magnitude >= raw) ?? 10);
  if (!Number.isFinite(step) || step <= 0) return [];
  const start = Math.ceil((view.center - view.span / 2) / step);
  const end = Math.floor((view.center + view.span / 2) / step);
  const result: Array<{ log: number; label: string }> = [];
  for (let i = 0; i <= Math.min(100, end - start); i++) {
    const log = (start + i) * step;
    result.push({ log, label: formatCoordinate(log) });
  }
  return result;
}
