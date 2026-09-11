import { useEffect, useState, type CSSProperties } from "react";
import { PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import FlightEvidence from "./FlightEvidence";
import { journeyRecordLink, readJourneyState, safeSourceUrl, type SignalJourney } from "../lib/signal-journeys";
import type { ExplorerItem } from "../lib/corpus";
import "../styles/signal-journeys.css";

const readable = (value: string | undefined, fallback = "unspecified") => (value ?? fallback).replaceAll("_", " ");
function coordinateKind(item: ExplorerItem) {
  if (!item.display) return "Frequency unspecified";
  if (item.display.mode === "claim-reference") return "Reference coordinate";
  return item.profileType === "event_rate" ? "Event rate" : "Frequency coordinate";
}

export default function SignalJourneys({ journeys }: { journeys: SignalJourney[] }) {
  const base = import.meta.env.BASE_URL;
  const [state, setState] = useState(() => readJourneyState("", journeys));
  const [ready, setReady] = useState(false);
  const current = journeys.find((journey) => journey.id === state.journey) ?? journeys[0];
  const index = Math.max(0, current.steps.findIndex((step) => step.item.id === state.stage));
  const stage = current.steps[index], item = stage.item;
  // First stage previews its outgoing hop; subsequent stages explain their incoming hop.
  const hopIndex = Math.max(0, index - 1), hop = current.hops[hopIndex];
  useEffect(() => {
    const restore = () => {
      const next = readJourneyState(location.search, journeys);
      setState(next); setReady(true);
      const url = new URL(location.href);
      url.searchParams.set("journey", next.journey); url.searchParams.set("stage", next.stage);
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [journeys]);
  function visit(journey: SignalJourney, step: number) {
    const next = journey.steps[step];
    if (!next || !ready || (journey.id === state.journey && next.item.id === state.stage)) return;
    const value = { journey: journey.id, stage: next.item.id };
    const url = new URL(location.href);
    url.searchParams.set("journey", value.journey); url.searchParams.set("stage", value.stage);
    history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setState(value);
  }
  return <div className="journey-app" data-ready={ready} data-journey={current.id} data-stage={item.id}>
    <section className="journey-picker" aria-label="Choose a signal journey">
      {journeys.map((journey) => <button type="button" key={journey.id} data-journey-id={journey.id}
        aria-pressed={journey.id === current.id} onClick={() => visit(journey, 0)}>
        <PhenomenonIcon item={journey.steps[0].item} />
        <span><strong>{journey.title}</strong><small>{journey.steps.length} stages · recorded connections</small></span>
        <span className="journey-picker-arrow" aria-hidden="true">↗</span>
      </button>)}
    </section>
    <section className="journey-story" aria-labelledby="journey-title">
      <div className="journey-story-heading"><span className="journey-eyebrow">A PROCESS, NOT A COINCIDENCE</span>
        <h2 id="journey-title">{current.title}</h2><p>{current.summary}</p>
      </div>
      <ol className="journey-timeline" style={{ "--journey-steps": current.steps.length } as CSSProperties} aria-label="Signal stages">
        {current.steps.map((step, stepIndex) => <li key={step.item.id}>
          <button type="button" className="journey-step" data-stage-id={step.item.id}
            aria-current={stepIndex === index ? "step" : undefined} onClick={() => visit(current, stepIndex)}>
            <span className="journey-step-number">{String(stepIndex + 1).padStart(2, "0")}</span>
            <PhenomenonIcon item={step.item} /><span className="journey-step-copy"><strong>{step.label}</strong>
              <span>{step.item.display ? phenomenonValue(step.item) : "Frequency unspecified"}</span>
              <small>{step.item.display ? coordinateKind(step.item) : "Still part of the process"}</small>
            </span>
          </button>
          {current.hops[stepIndex] && <span className="journey-hop-label" data-hop-id={current.hops[stepIndex].id}>
            <span aria-hidden="true" className="journey-hop-arrow" />{readable(current.hops[stepIndex].type)}
          </span>}
        </li>)}
      </ol>
      <p className="journey-order-note">Follow the numbered stages. Spacing shows neither frequency nor elapsed time; arrows represent the named, recorded relationships.</p>
      <div className="journey-navigation">
        <button type="button" disabled={index === 0} onClick={() => visit(current, index - 1)}>← Previous stage</button>
        <p className="journey-status" role="status" aria-live="polite" aria-atomic="true">Stage {index + 1} of {current.steps.length}: {stage.label}</p>
        <button type="button" disabled={index === current.steps.length - 1} onClick={() => visit(current, index + 1)}>Next stage →</button>
      </div>
    </section>
    <div className="journey-inspection">
      <section className="journey-stage-detail" aria-label="Selected signal stage">
        <div className="journey-detail-title"><PhenomenonIcon item={item} /><div><span className="journey-eyebrow">WHAT IS HAPPENING HERE?</span><h2>{stage.label}</h2></div></div>
        <p className="journey-stage-summary">{item.summary}</p>
        <dl className="journey-observables"><div><dt>System</dt><dd>{stage.system}</dd></div><div><dt>What is observed</dt><dd>{stage.observable}</dd></div></dl>
        <div className="journey-quantity" data-coordinate-kind={coordinateKind(item)}>
          <small>{coordinateKind(item)}</small><strong>{item.display ? phenomenonValue(item) : "No frequency assigned"}</strong>
          <p>{item.display?.note ?? "This record leaves its frequency profile unresolved. Its connection can be known without assigning it the preceding stage's frequency."}</p>
          {item.display && <p className="journey-native">Original value: {item.display.nativeLabel}</p>}
        </div>
        <p className="journey-record-note">An existing reference record, not a live measurement. Matching event rates do not imply identical waveforms or independent measurements.</p>
        <div className="journey-record-actions"><a className="journey-primary-link" href={journeyRecordLink(item, base, "explore")}>Inspect in Atlas ↗</a>
          <a href={journeyRecordLink(item, base, "flight")}>Inspect in Flight ↗</a>
          <a href={`${base}phenomena/${encodeURIComponent(item.id)}/`}>Full source record ↗</a>
        </div>
        <details className="journey-record-evidence" key={item.id}><summary>Evidence for this observation</summary><p>Full record: {item.name}</p><FlightEvidence item={item} /></details>
      </section>
      <aside className="journey-connection-detail" aria-label="Evidence for the connection" data-edge-id={hop.id}>
        <span className="journey-eyebrow">{index === 0 ? "NEXT CONNECTION" : "CONNECTION INTO THIS STAGE"}</span>
        <h2>Why are these connected?</h2>
        <div className="journey-edge-pair"><span>{current.steps[hopIndex].label}</span><span aria-hidden="true">↓</span><strong>{readable(hop.type)}</strong><span aria-hidden="true">↓</span><span>{current.steps[hopIndex + 1].label}</span></div>
        <p className="journey-edge-description">{hop.description}</p>
        <dl className="journey-edge-evidence"><div><dt>Relationship category</dt><dd>{readable(hop.category)}</dd></div>
          <div><dt>Mechanism</dt><dd>{readable(hop.evidence.mechanism_status)}</dd></div>
          <div><dt>Evidence for this edge</dt><dd>{readable(hop.evidence.basis)} · {readable(hop.evidence.review_status, "unreviewed")}</dd></div>
        </dl>
        {hop.evidence.derivation && <p className="journey-edge-derivation">{hop.evidence.derivation}</p>}
        {hop.evidence.locator && <p>Source location: {hop.evidence.locator}</p>}
        <div className="journey-edge-sources"><h3>Sources for this connection</h3>{hop.sources.map((source) => {
          const url = safeSourceUrl(source.url);
          return <p key={source.id} data-source-id={source.id}>{url ? <a href={url}>{source.title} ↗</a> : source.title}{source.publisher && <small>{source.publisher}</small>}</p>;
        })}</div>
        <details className="journey-edge-origin" key={hop.id}><summary>Exact relationship & provenance</summary>
          <p><code>{hop.id}</code></p><p>Direction: <code>{hop.sourceId}</code> → <code>{hop.targetId}</code></p>
          <p>Evidence is resolved from the record that owns this relationship: <a href={`${base}phenomena/${encodeURIComponent(hop.ownerId)}/`}>{hop.ownerName}</a>.</p>
          <p>This edge's evidence is separate from the selected observation's quantitative provenance.</p>
        </details>
      </aside>
    </div>
    <footer className="journey-footer"><a href={`${base}explore/`}>← Return to free exploration</a><p>Curated paths through the existing graph. No autoplay, inferred connections, or simulated signals.</p></footer>
  </div>;
}
