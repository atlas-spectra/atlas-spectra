import type { ExplorerItem } from "./corpus";
import journeyDocument from "../../presentation/journeys.json";
import { PROCESS_GROUPS } from "./process-groups";
import { planFlightLabels, type FlightModel } from "./flight";

export const COMPACT_FLIGHT_LABEL_HEIGHT = 48;

/** An editorial entry point into an EXISTING journey, not new scientific membership. */
function cardiacGuide() {
  const group = PROCESS_GROUPS.find((entry) => entry.id === "heart-activity");
  const journey = journeyDocument.journeys.find((entry) => entry.id === "cardiac-sensing");
  if (!group || !journey) throw new Error("Flight's cardiac entry point must resolve its group and journey");
  const members = new Set(group.facets.map((facet) => facet.recordId));
  if (journey.steps.filter((step) => members.has(step.recordId)).length < 2) throw new Error("Cardiac journey must contain its reviewed process observations");
  return {
    anchorId: group.anchorId, journeyId: journey.id, title: journey.title,
    deferredIds: journey.steps.filter((step) => !members.has(step.recordId)).map((step) => step.recordId),
    revealIds: [group.anchorId, ...journey.steps.map((step) => step.recordId)],
  };
}
export const FLIGHT_SIGNAL_GUIDE = cardiacGuide();

/** Reuse the tested anchor planner; shrink its rectangles without relocating anchors.
 * Only labels are deferred. Geometry, bounds, overview, search and record lookup keep every record.
 * Deferral requires a visible representative, and selecting ANY signal stage reveals the path.
 */
export function quietFlightPlan(model: FlightModel, at: number, width: number, height: number, selectedId: string | null, detailed: boolean) {
  const limit = detailed ? (width < 600 ? 3 : 5) : (width < 600 ? 2 : 3);
  let plan = planFlightLabels(model, at, width, height, selectedId);
  const deferredIds = new Set<string>();
  if (!detailed && !FLIGHT_SIGNAL_GUIDE.revealIds.includes(selectedId ?? "")
    && plan.labels.slice(0, limit).some((label) => label.record.id === FLIGHT_SIGNAL_GUIDE.anchorId)) {
    for (const id of FLIGHT_SIGNAL_GUIDE.deferredIds) if (model.records.some((record) => record.id === id)) deferredIds.add(id);
    if (deferredIds.size) plan = planFlightLabels({ ...model, records: model.records.filter((record) => !deferredIds.has(record.id)) }, at, width, height, selectedId);
  }
  return { ...plan, deferredIds, labels: plan.labels.slice(0, limit).map((label) => ({
    ...label, top: label.top + (label.height - COMPACT_FLIGHT_LABEL_HEIGHT) / 2, height: COMPACT_FLIGHT_LABEL_HEIGHT,
  })) };
}

/** A scale position, never a frequency assigned to every visible landmark. */
export function formatScaleRate(log: number): string {
  if (!Number.isFinite(log)) return "No scale position";
  if (log < -3 || log > 12) return `10^${Number(log.toFixed(2))} per second`;
  const value = 10 ** log;
  const units: [number, string][] = [[1e12, "trillion"], [1e9, "billion"], [1e6, "million"], [1e3, "thousand"], [1, ""]];
  const [scale, name] = units.find(([threshold]) => value >= threshold) ?? [1, ""];
  return `${Number((value / scale).toPrecision(3))}${name ? ` ${name}` : ""} per second`;
}
const number = (value: number) => String(Number(value.toPrecision(3)));

/** Formatting the existing adapter, not reinterpreting event counts as pure oscillators. */
export function eventRateReading(item: ExplorerItem): string | null {
  const d = item.display;
  if (item.profileType !== "event_rate" || !d || d.mode === "claim-reference"
    || ![d.lowHz, d.highHz].every((n) => Number.isFinite(n) && n > 0) || d.highHz < d.lowHz) return null;
  const values = d.lowHz === d.highHz ? number(d.lowHz) : `${number(d.lowHz)}–${number(d.highHz)}`;
  return `${values} ${item.id === FLIGHT_SIGNAL_GUIDE.anchorId ? "beat events" : "events"}/s`;
}

/** These are navigation shortcuts, not groups and not extra observations. */
export const FLIGHT_OVERVIEW_ANCHORS = [
  "biology.heart.resting-adult-rate", "acoustics.standard-pitch.a4-440hz",
  "timekeeping.quartz-wristwatch.resonance", "atomic.cesium-133.hyperfine-transition",
  "molecular.carbon-dioxide.bending-mode", "vision.cie-2006.lms-cone-fundamentals-2deg",
] as const;
