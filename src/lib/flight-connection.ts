import type { ExplorerItem } from "./corpus";
import type { FlightJourney } from "./flight-journeys";
import type { FlightBounds, FlightModel, FlightRecord } from "./flight";
import type { JourneyHop } from "./signal-journeys";

export interface ConnectionEndpoint {
  item: ExplorerItem;
  label: string;
  /** The original supported display object, never a coordinate borrowed from its peer. */
  position: FlightRecord | null;
}
export type ConnectionPlacement = "unpositioned" | "same-extent" | "overlap" | "lower" | "higher" | "separate-lines";
export interface FlightConnection {
  hop: JourneyHop;
  source: ConnectionEndpoint;
  target: ConnectionEndpoint;
  placement: ConnectionPlacement;
}

/** Same full-corpus scale in the navigator and both trace rows. */
export function flightOverviewX(log: number, bounds: FlightBounds): number {
  return 10 + (log - bounds.min) / (bounds.max - bounds.min) * 980;
}
function supportedPosition(record: FlightRecord | undefined, bounds: FlightBounds): FlightRecord | null {
  if (!record || ![record.low, record.high].every(Number.isFinite)
    || record.low > record.high || record.low < bounds.min || record.high > bounds.max) return null;
  if (record.kind === "lines" && !record.lines.length) return null;
  if (record.lines.some((line) => !Number.isFinite(line) || line < record.low || line > record.high)) return null;
  return record;
}
function contains(record: FlightRecord, log: number): boolean {
  return record.lines.length ? record.lines.includes(log) : log >= record.low && log <= record.high;
}
/** A line spectrum is a set of actual lines, not a filled envelope. */
export function connectionPlacement(a: FlightRecord | null, b: FlightRecord | null): ConnectionPlacement {
  if (!a || !b) return "unpositioned";
  if (!a.lines.length && !b.lines.length && a.low === b.low && a.high === b.high) return "same-extent";
  if (b.high < a.low) return "lower";
  if (b.low > a.high) return "higher";
  const overlaps = a.lines.length ? a.lines.some((line) => contains(b, line))
    : b.lines.length ? b.lines.some((line) => contains(a, line)) : true;
  return overlaps ? "overlap" : "separate-lines";
}

/** Input journeys were source-validated at build time. Fail closed on a stale/mismatched pair. */
export function buildFlightConnection(journey: FlightJourney, stageId: string, items: ExplorerItem[], model: FlightModel): FlightConnection | null {
  const { min, max } = model.bounds;
  if (![min, max].every(Number.isFinite) || min >= max) return null;
  const index = journey.steps.findIndex((step) => step.recordId === stageId);
  if (index < 0) return null;
  const pair = Math.max(0, index - 1);
  const sourceStep = journey.steps[pair], targetStep = journey.steps[pair + 1], hop = journey.hops[pair];
  if (!sourceStep || !targetStep || !hop || hop.sourceId !== sourceStep.recordId || hop.targetId !== targetStep.recordId
    || hop.category !== "physical" || !hop.ownerId || !hop.evidence.source_refs?.length || !hop.sources.length) return null;
  const sourceItem = items.find((item) => item.id === hop.sourceId), targetItem = items.find((item) => item.id === hop.targetId);
  if (!sourceItem || !targetItem) return null;
  const source = { item: sourceItem, label: sourceStep.label,
    position: supportedPosition(model.records.find((record) => record.id === sourceItem.id), model.bounds) };
  const target = { item: targetItem, label: targetStep.label,
    position: supportedPosition(model.records.find((record) => record.id === targetItem.id), model.bounds) };
  return { hop, source, target, placement: connectionPlacement(source.position, target.position) };
}

export const CONNECTION_PLACEMENT_COPY: Record<ConnectionPlacement, string> = {
  "unpositioned": "A connection can be documented without a frequency for every stage. An unpositioned observation has no mark on this scale; it does not inherit its peer's value.",
  "same-extent": "Same displayed extent, different observations. Matching values do not establish this connection or imply identical waveforms; the named relationship has its own evidence.",
  "overlap": "The displayed positions overlap. This does not make the observations identical or establish a mechanism; the named relationship has its own evidence.",
  "lower": "The process moves from A to B, but B is lower on the frequency scale. Process order is not increasing frequency or elapsed time.",
  "higher": "The process moves from A to B, and B is higher on the frequency scale. Their separation is not elapsed time or physical distance.",
  "separate-lines": "The outer spans overlap, but the actual displayed positions do not. Gaps between spectral lines remain empty; an envelope alone does not establish shared frequencies.",
};
