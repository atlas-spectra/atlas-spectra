import type { SignalJourney, JourneyHop, JourneyState } from "./signal-journeys";
import { boundedCoordinate, recordCoordinate, type FlightModel } from "./flight";

/** Serializable presentation only: original observations are supplied once by Flight. */
export interface FlightJourney {
  id: string; title: string; summary: string;
  steps: Array<{ recordId: string; label: string; system: string; observable: string }>;
  hops: JourneyHop[];
}
export interface FlightBrowseState {
  at: number; selectedId: string | null; detailed: boolean; query: string; showAll: boolean;
}
export function compactFlightJourneys(journeys: SignalJourney[]): FlightJourney[] {
  return journeys.map(({ id, title, summary, steps, hops }) => ({ id, title, summary, hops,
    steps: steps.map(({ item, label, system, observable }) => ({ recordId: item.id, label, system, observable })),
  }));
}
/** Unlike the dedicated Journeys route, free Flight must not start a tour implicitly. */
export function readFlightJourney(search: string, journeys: FlightJourney[]): JourneyState | null {
  const params = new URLSearchParams(search);
  const journey = journeys.find((entry) => entry.id === params.get("journey"));
  if (!journey) return null;
  const stage = journey.steps.find((step) => step.recordId === params.get("stage")) ?? journey.steps[0];
  return stage ? { journey: journey.id, stage: stage.recordId } : null;
}
/** Navigation target only; null means keep the camera, not assign this value to the stage. */
export function flightJourneyCoordinate(model: FlightModel, id: string, near: number): number | null {
  const record = model.records.find((entry) => entry.id === id);
  return record ? boundedCoordinate(recordCoordinate(record, near), model.bounds) : null;
}
export function flightJourneySearch(search: string, view: FlightBrowseState, guide: JourneyState | null): string {
  const params = new URLSearchParams(search);
  params.set("at", String(view.at));
  view.selectedId ? params.set("entity", view.selectedId) : params.delete("entity");
  view.detailed ? params.set("detail", "observations") : params.delete("detail");
  if (guide) { params.set("journey", guide.journey); params.set("stage", guide.stage); }
  else { params.delete("journey"); params.delete("stage"); }
  return params.toString();
}
/** History state is untrusted and may predate a dataset or a deployment. */
export function readFlightBrowseState(value: unknown, model: FlightModel, ids: ReadonlySet<string>): FlightBrowseState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.at !== "number" || !Number.isFinite(v.at) || typeof v.detailed !== "boolean"
    || typeof v.query !== "string" || typeof v.showAll !== "boolean") return null;
  return { at: boundedCoordinate(v.at, model.bounds), selectedId: typeof v.selectedId === "string" && ids.has(v.selectedId) ? v.selectedId : null,
    detailed: v.detailed, query: v.query.slice(0, 1000), showAll: v.showAll };
}
export function flightJourneyLink(base: string, journey: FlightJourney, stage: string): string {
  const step = journey.steps.find((entry) => entry.recordId === stage) ?? journey.steps[0];
  return `${base}flight/?${new URLSearchParams({ journey: journey.id, stage: step.recordId })}`;
}
