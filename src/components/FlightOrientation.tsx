import { useId, type ReactNode } from "react";
import type { ExplorerItem } from "../lib/corpus";
import { groupForAnchor, type ProcessGroup } from "../lib/process-groups";
import { identityFor } from "../lib/phenomenon-identity";
import { flightDepthWindow, formatFlightHz, MARK_NAMES, type FlightModel } from "../lib/flight";
import { flightOverviewX } from "../lib/flight-connection";
import { eventRateReading, FLIGHT_OVERVIEW_ANCHORS, formatScaleRate } from "../lib/flight-presentation";
import { PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import "../styles/flight-orientation.css";
import "../styles/flight-quiet.css";

/** Compact scene names and richer browser identities share one source of subject metadata. */
export function FlightLandmarkFace({ item, group, compact = false }: { item: ExplorerItem; group?: ProcessGroup; compact?: boolean }) {
  const identity = identityFor(item);
  const qualifier = group ? `${group.facets.length} observations ↗` : !item.display ? "Unpositioned"
    : item.display.mode === "claim-reference" ? "Claim reference" : item.profileType === "event_rate" ? "Event rate" : MARK_NAMES[item.markKind];
  return <span className={`flight-landmark-face${compact ? " is-compact" : ""}`} data-process-id={group?.id}>
    <PhenomenonIcon item={item} />
    <span className="flight-landmark-copy"><strong>{group?.title ?? identity.title}</strong>
      {!compact && <><span className="flight-landmark-subtitle">{group?.anchorLabel ?? identity.subtitle}</span>
        <span className="flight-landmark-value">{phenomenonValue(item)}</span></>}
      {(!compact || group || item.display?.mode === "claim-reference") && <span className="flight-landmark-qualifier">{qualifier}</span>}
    </span>
  </span>;
}

/** One visible navigator: the native range input sits ON the whole-corpus diagram. */
export function FlightDepthOverview({ model, items, at, width, height, labeled, eligible, available, onJump, onChoose, connection }: {
  model: FlightModel; items: ExplorerItem[]; at: number; width: number; height: number;
  labeled: number; eligible: number; available: boolean; onJump: (at: number) => void; onChoose: (id: string) => void;
  connection?: ReactNode;
}) {
  const clipId = useId();
  const window = flightDepthWindow(model, at, width, height);
  const x = (log: number) => flightOverviewX(log, model.bounds);
  const shortcuts = FLIGHT_OVERVIEW_ANCHORS.flatMap((id) => {
    const item = items.find((entry) => entry.id === id), record = model.records.find((entry) => entry.id === id);
    return item && record ? [item] : [];
  });
  return <div className="flight-depth-overview" aria-label="Flight depth overview" data-window-min={window.min} data-window-max={window.max}>
    <div className="flight-depth-heading"><strong>The whole atlas</strong><span>Drag to travel · select a landmark to jump</span></div>
    <label className="flight-ruler-label" htmlFor="flight-coordinate">Frequency ruler <span>Your position: {formatScaleRate(at)}</span></label>
    <div className="flight-navigator-track">
      <svg viewBox="0 0 1000 62" preserveAspectRatio="none" aria-hidden="true">
        <defs><clipPath id={clipId}><rect x="10" y="4" width="980" height="54" rx="6" /></clipPath></defs>
        <rect x="10" y="4" width="980" height="54" rx="6" className="flight-depth-track" />
        <g clipPath={`url(#${clipId})`}>
          <rect className="flight-depth-window" x={x(window.min)} y="4" width={Math.max(1, x(window.max) - x(window.min))} height="54" />
          {model.records.map((record, i) => record.lines.length ? record.lines.map((line) =>
            <line key={`${record.id}:${line}`} data-overview-record-id={record.id} x1={x(line)} x2={x(line)} y1={13 + i % 3 * 12} y2={21 + i % 3 * 12} className="flight-depth-mark" />)
            : <rect key={record.id} data-overview-record-id={record.id} x={x(record.low)} y={13 + i % 3 * 12} width={Math.max(2, x(record.high) - x(record.low))} height="6" rx="2" className={`flight-depth-mark${record.kind === "reference" ? " is-reference" : ""}`} />)}
          <line x1={x(at)} x2={x(at)} y1="5" y2="57" className="flight-depth-cursor" />
        </g>
      </svg>
      <input id="flight-coordinate" type="range" min={model.bounds.min} max={model.bounds.max} step="0.01" value={at}
        aria-valuetext={`${formatScaleRate(at)}; ${formatFlightHz(at)} equivalent, your position on the scale`} onChange={(event) => onJump(Number(event.target.value))} />
    </div>
    <div className="flight-scale-ends"><span>Slower</span><span>Each decade is a tenfold change</span><span>Faster</span></div>
    {connection}
    <div className="flight-overview-shortcuts" role="group" aria-label="Jump to a known landmark">{shortcuts.map((item) => <button
      type="button" key={item.id} data-jump-id={item.id} title={`${item.name}: ${phenomenonValue(item)}`} onClick={() => onChoose(item.id)}>
      <PhenomenonIcon item={item} /><span><strong>{groupForAnchor(item.id)?.title ?? identityFor(item).title}</strong><small>{phenomenonValue(item)}</small></span>
    </button>)}</div>
    <details className="flight-scale-details"><summary>About this view</summary>
      <p><strong>Local depth window:</strong> {formatFlightHz(window.min)} — {formatFlightHz(window.max)}</p>
      <p>{available ? `${labeled} labels shown from ${eligible} eligible anchors in this layout.` : "3D labels unavailable; the navigator and records remain usable."}</p>
      <p>Shading indicates the label-depth window, not every visible object. The overview includes all source observations, even when their scene labels are deferred or do not fit. Shortcut buttons are not spaced on the frequency axis.</p>
    </details>
  </div>;
}

export function FlightScaleHelp() {
  return <details className="flight-scale-help"><summary>Hz and beats/min — how do they compare?</summary>
    <div className="flight-unit-equivalence"><strong>60 beats/min</strong><span aria-hidden="true">=</span><strong>1 beat/s</strong></div>
    <p>Divide a per-minute count by 60 to place it on a per-second scale. For a regularly repeating signal, one complete cycle each second is 1 Hz.</p>
    <p>A count of 60 beats in a minute need not mean evenly spaced beats. An event rate does not describe the full waveform. Equal numbers do not establish a shared mechanism.</p>
    <p>The large readout is <strong>your position on the scale</strong>, not the value of every visible landmark. Each record retains its own quantity, transformation and evidence.</p>
    <p className="flight-unit-sources"><a href="https://www.nist.gov/how-do-you-measure-it/how-do-you-measure-second">NIST: cycles per second</a> · <a href="https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates">AHA: beats per minute</a></p>
  </details>;
}

export function FlightRateContext({ item }: { item: ExplorerItem }) {
  const rate = eventRateReading(item);
  if (!rate) return null;
  return <section className="flight-rate-context" aria-label="Event rate on the common scale">
    <span>THIS OBSERVATION · EVENT RATE</span><strong>{item.display!.nativeLabel.replace(/\bbpm\b/g, "beats/min")}</strong>
    <p>On the common scale: <b>{rate}</b></p>
    <small>Same count, different time unit. This reference range is not a waveform or evidence of evenly spaced events. Its own provenance is below.</small>
  </section>;
}
