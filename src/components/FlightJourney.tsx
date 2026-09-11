import { useEffect, useRef } from "react";
import type { FlightJourney } from "../lib/flight-journeys";
import { safeSourceUrl } from "../lib/signal-journeys";
import "../styles/flight-journey.css";

const readable = (value: string | undefined) => (value ?? "unspecified").replaceAll("_", " ");

export function FlightJourneyPicker({ journeys, disabled, onStart }: {
  journeys: FlightJourney[]; disabled: boolean; onStart: (id: string) => void;
}) {
  return <details className="flight-journey-picker">
    <summary id="flight-journey-picker">Follow a signal</summary>
    <div>{journeys.map((journey) => <button type="button" key={journey.id} disabled={disabled}
      data-start-journey={journey.id} onClick={(event) => {
        event.currentTarget.closest("details")?.removeAttribute("open"); onStart(journey.id);
      }}><strong>{journey.title}</strong><span>{journey.steps.length} stages · you set the pace</span></button>)}</div>
  </details>;
}

export function FlightJourneyPanel({ journey, stageId, positioned, onVisit, onLeave, base }: {
  journey: FlightJourney; stageId: string; positioned: boolean;
  onVisit: (id: string, stage: string) => void; onLeave: () => void; base: string;
}) {
  const index = Math.max(0, journey.steps.findIndex((step) => step.recordId === stageId));
  const stage = journey.steps[index];
  const heading = useRef<HTMLHeadingElement>(null);
  // Focus only on entering/changing a journey, never on every next-stage action.
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [journey.id]);
  return <section className="flight-journey-panel" aria-label="Guided flight journey" data-journey-id={journey.id} data-stage-id={stage.recordId}>
    <span className="flight-journey-kicker">FOLLOW THE SIGNAL · {index + 1} / {journey.steps.length}</span>
    <h2 ref={heading} tabIndex={-1}>{journey.title}</h2>
    <p className="flight-journey-current" role="status" aria-live="polite" aria-atomic="true">Stage {index + 1} of {journey.steps.length}: <strong>{stage.label}</strong></p>
    <div className="flight-journey-navigation">
      <button type="button" disabled={index === 0} onClick={() => onVisit(journey.id, journey.steps[index - 1].recordId)}>← Previous stage</button>
      <button type="button" disabled={index === journey.steps.length - 1} onClick={() => onVisit(journey.id, journey.steps[index + 1].recordId)}>Next stage →</button>
    </div>
    <label className="flight-journey-stage-label">Jump to a stage
      <select aria-label="Journey stage" value={stage.recordId} onChange={(event) => onVisit(journey.id, event.target.value)}>
        {journey.steps.map((step, i) => <option key={step.recordId} value={step.recordId}>{i + 1}. {step.label}</option>)}
      </select>
    </label>
    {!positioned && <p className="flight-journey-unpositioned" role="note"><strong>No frequency assigned.</strong> The camera stays at its current scale position; that number does not describe this stage.</p>}
    <p className="flight-journey-note">Steps follow a recorded process, not increasing frequency or elapsed time. Scroll freely; Next stage returns to the path.</p>
    <div className="flight-journey-exit"><button type="button" onClick={onLeave}>Return to browsing</button>
      <a href={`${base}journeys/?${new URLSearchParams({ journey: journey.id, stage: stage.recordId })}`}>Full journey & sources ↗</a></div>
  </section>;
}

/** Hops are already validated and resolved in the owning record's source namespace. */
export function FlightJourneyConnection({ journey, stageId, base }: { journey: FlightJourney; stageId: string; base: string }) {
  const index = Math.max(0, journey.steps.findIndex((step) => step.recordId === stageId));
  const hopIndex = Math.max(0, index - 1), hop = journey.hops[hopIndex];
  if (!hop) return null;
  return <section id={`flight-journey-edge-${hop.id}`} tabIndex={-1} className="flight-journey-connection" aria-label="Journey connection evidence" data-edge-id={hop.id} data-owner-id={hop.ownerId}>
    <h3>{index === 0 ? "Next connection" : "Connection into this stage"}</h3>
    <p className="flight-journey-pair"><strong>{journey.steps[hopIndex].label}</strong><span aria-hidden="true"> → </span><strong>{journey.steps[hopIndex + 1].label}</strong></p>
    <p className="flight-journey-edge-type">{readable(hop.type)} · {readable(hop.category)}</p>
    <p>{hop.description}</p>
    <details key={hop.id}><summary>Why this connection? Evidence & sources</summary>
      <p>Mechanism: {readable(hop.evidence.mechanism_status)}</p>
      <p>Evidence: {readable(hop.evidence.basis)} · {readable(hop.evidence.review_status)}</p>
      {hop.evidence.derivation && <p>Derivation: {hop.evidence.derivation}</p>}
      {hop.evidence.locator && <p>Source location: {hop.evidence.locator}</p>}
      {hop.sources.map((source) => {
        const url = safeSourceUrl(source.url);
        return <p key={source.id} data-source-id={source.id}>{url ? <a href={url}>{source.title}</a> : source.title}</p>;
      })}
      <p>Relationship: <code>{hop.id}</code></p><p>Direction: <code>{hop.sourceId}</code> → <code>{hop.targetId}</code></p>
      <p>Sources resolved from <a href={`${base}phenomena/${encodeURIComponent(hop.ownerId)}/`}>{hop.ownerName}</a>, the owner of this edge—not substituted from its endpoints.</p>
      <p>This is relationship evidence, separate from evidence for the observation's quantity below.</p>
    </details>
  </section>;
}
