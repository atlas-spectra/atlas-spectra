import { useId, useMemo } from "react";
import type { ExplorerItem } from "../lib/corpus";
import type { FlightJourney } from "../lib/flight-journeys";
import { formatFlightHz, MARK_NAMES, type FlightModel } from "../lib/flight";
import { buildFlightConnection, CONNECTION_PLACEMENT_COPY, flightOverviewX } from "../lib/flight-connection";
import { PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import "../styles/flight-connection.css";

const readable = (value: string | undefined) => (value ?? "unspecified").replaceAll("_", " ");

/** One opt-in comparison, outside the 3D corridor. Key by journey to reset on departure. */
export default function FlightConnectionTrace({ journey, stageId, model, items, onVisit }: {
  journey: FlightJourney; stageId: string; model: FlightModel; items: ExplorerItem[]; onVisit: (id: string) => void;
}) {
  const captionId = useId();
  const connection = useMemo(() => buildFlightConnection(journey, stageId, items, model), [journey, stageId, items, model]);
  if (!connection) return null;
  const { source, target, hop, placement } = connection;
  const endpoints = [source, target];
  const x = (log: number) => flightOverviewX(log, model.bounds);
  return <details className="flight-connection-trace" data-edge-id={hop.id} data-placement={placement} data-owner-id={hop.ownerId}>
    <summary>Trace this connection <span>Compare its two observations on the scale</span></summary>
    <section aria-label="Connection on the frequency scale" className="flight-connection-content">
      <p className="flight-connection-direction"><strong>A → B</strong> · {readable(hop.type)} · {readable(hop.category)}</p>
      <div className="flight-connection-endpoints">
        {endpoints.map((endpoint, index) => <div key={index} className={`flight-connection-endpoint endpoint-${index}`} data-endpoint-id={endpoint.item.id}>
          <span className="flight-connection-role">{index === 0 ? "A · Source" : "B · Target"}</span>
          <div className="flight-connection-identity"><PhenomenonIcon item={endpoint.item} /><strong>{endpoint.label}</strong></div>
          <p className="flight-connection-value">{endpoint.position ? phenomenonValue(endpoint.item) : "No supported scale position"}</p>
          <small>{!endpoint.position ? (endpoint.item.display ? "Not plotted" : "Frequency unspecified · not plotted")
            : endpoint.item.display?.mode === "claim-reference" ? "Claim reference, not a measured spectrum"
              : endpoint.item.profileType === "event_rate" ? "Event rate, not a waveform" : MARK_NAMES[endpoint.item.markKind]}</small>
          <button type="button" onClick={() => onVisit(endpoint.item.id)}>{index === 0 ? "Inspect source" : "Inspect target"}</button>
        </div>)}
      </div>
      <figure className="flight-connection-figure" aria-describedby={captionId}>
        <div className="flight-connection-plot">
          <svg viewBox="0 0 1000 110" preserveAspectRatio="none" aria-hidden="true">
            {endpoints.map((endpoint, index) => {
              const y = index === 0 ? 28 : 77, record = endpoint.position;
              return <g key={index} data-trace-role={index === 0 ? "source" : "target"} data-trace-record-id={endpoint.item.id} className={`flight-trace-row trace-${index}`}>
                <line x1="10" x2="990" y1={y} y2={y} className="flight-trace-baseline" />
                {record && (record.lines.length ? record.lines.map((log) => <line key={log}
                  data-trace-mark="line" data-log-low={log} data-log-high={log}
                  x1={x(log)} x2={x(log)} y1={y - 6} y2={y + 6} className="flight-trace-mark" />)
                  : record.low === record.high ? <line data-trace-mark="point" data-log-low={record.low} data-log-high={record.high}
                    x1={x(record.low)} x2={x(record.low)} y1={y - 7} y2={y + 7} className={`flight-trace-mark${record.kind === "reference" ? " is-reference" : ""}`} />
                    : <rect data-trace-mark="extent" data-log-low={record.low} data-log-high={record.high}
                      x={x(record.low)} y={y - 6} width={x(record.high) - x(record.low)} height="12"
                      className={`flight-trace-mark${record.kind === "reference" ? " is-reference" : ""}`} />)}
              </g>;
            })}
          </svg>
          <span className="flight-trace-row-name row-a" aria-hidden="true">A · Source</span>
          <span className="flight-trace-row-name row-b" aria-hidden="true">B · Target</span>
        </div>
        <div className="flight-connection-axis"><span>{formatFlightHz(model.bounds.min)}</span><span>Same whole-atlas scale ↑</span><span>{formatFlightHz(model.bounds.max)}</span></div>
        <figcaption id={captionId}>Rows separate source and target for readability; only horizontal position encodes the display coordinate. Marks show documented points, lines or extents—not a signal travelling between them.</figcaption>
      </figure>
      <p className="flight-connection-explanation" role="status" aria-live="polite" aria-atomic="true">{source.label} → {target.label}. {CONNECTION_PLACEMENT_COPY[placement]}</p>
      <p className="flight-connection-evidence-link"><span>Mechanism: {readable(hop.evidence.mechanism_status)}</span><a href={`#flight-journey-edge-${hop.id}`} onClick={(event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const target = document.getElementById(`flight-journey-edge-${hop.id}`);
        if (!target) return;
        // A hash-navigation entry would discard the saved browsing snapshot.
        // Ordinary inspection moves focus, not the camera or history state.
        event.preventDefault(); target.scrollIntoView({ block: "nearest", behavior: "auto" }); target.focus({ preventScroll: true });
      }}>Evidence for this connection ↗</a></p>
    </section>
  </details>;
}
