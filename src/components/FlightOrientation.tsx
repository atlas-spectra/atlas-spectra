import { useId } from "react";
import type { ExplorerItem } from "../lib/corpus";
import type { ProcessGroup } from "../lib/process-groups";
import { identityFor } from "../lib/phenomenon-identity";
import { flightDepthWindow, formatFlightHz, MARK_NAMES, type FlightModel } from "../lib/flight";
import { PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import "../styles/flight-orientation.css";

/** Subject identity first; quantity and reference/event semantics never become an icon. */
export function FlightLandmarkFace({ item, group }: { item: ExplorerItem; group?: ProcessGroup }) {
  const identity = identityFor(item);
  const qualifier = group ? `${group.facets.length} observations ↗` : !item.display ? "Unpositioned"
    : item.display.mode === "claim-reference" ? "Claim reference" : item.profileType === "event_rate" ? "Event rate" : MARK_NAMES[item.markKind];
  return <span className="flight-landmark-face" data-process-id={group?.id}>
    <PhenomenonIcon item={item} />
    <span className="flight-landmark-copy"><strong>{group?.title ?? identity.title}</strong>
      <span className="flight-landmark-subtitle">{group?.anchorLabel ?? identity.subtitle}</span>
      <span className="flight-landmark-value">{phenomenonValue(item)}</span>
      <span className="flight-landmark-qualifier">{qualifier}</span>
    </span>
  </span>;
}

export function FlightDepthOverview({ model, at, width, height, labeled, eligible, available }: {
  model: FlightModel; at: number; width: number; height: number; labeled: number; eligible: number; available: boolean;
}) {
  const clipId = useId();
  const window = flightDepthWindow(model, at, width, height);
  const span = Math.max(Number.EPSILON, model.bounds.max - model.bounds.min);
  const x = (log: number) => 10 + (log - model.bounds.min) / span * 980;
  return <div className="flight-depth-overview" aria-label="Flight depth overview" data-window-min={window.min} data-window-max={window.max}>
    <div className="flight-depth-heading"><strong>The whole atlas</strong><span>{available ? `${labeled} labels · ${eligible} eligible anchors` : "3D labels unavailable"}</span></div>
    <svg viewBox="0 0 1000 62" preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id={clipId}><rect x="10" y="4" width="980" height="54" rx="6" /></clipPath></defs>
      <rect x="10" y="4" width="980" height="54" rx="6" className="flight-depth-track" />
      <g clipPath={`url(#${clipId})`}>
        <rect className="flight-depth-window" x={x(window.min)} y="4" width={Math.max(1, x(window.max) - x(window.min))} height="54" />
        {model.records.map((record, i) => record.lines.length ? record.lines.map((line) =>
          <line key={`${record.id}:${line}`} x1={x(line)} x2={x(line)} y1={13 + i % 3 * 12} y2={21 + i % 3 * 12} className="flight-depth-mark" />)
          : <rect key={record.id} x={x(record.low)} y={13 + i % 3 * 12} width={Math.max(2, x(record.high) - x(record.low))} height="6" rx="2" className={`flight-depth-mark${record.kind === "reference" ? " is-reference" : ""}`} />)}
        <line x1={x(at)} x2={x(at)} y1="5" y2="57" className="flight-depth-cursor" />
      </g>
    </svg>
    <p><strong>Local depth window:</strong> {formatFlightHz(window.min)} — {formatFlightHz(window.max)}</p>
    <small>Shading shows the label-depth window, not every visible object. Overlapping or off-screen anchors may be unlabeled. The overview includes all source observations; use the ruler below to travel.</small>
  </div>;
}
