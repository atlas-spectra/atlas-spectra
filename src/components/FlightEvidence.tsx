import type { Evidence, ExplorerItem } from "../lib/corpus";

function EvidenceDetails({ evidence, item }: { evidence?: Evidence; item: ExplorerItem }) {
  if (!evidence) return <p className="flight-evidence">No evidence is attached to this reference claim.</p>;
  return <>
    <p className="flight-evidence">{`${evidence.basis ?? "unspecified"} · ${evidence.review_status ?? "unreviewed"}`.replaceAll("_", " ")}</p>
    {evidence.mechanism_status && <p className="flight-evidence">Mechanism: {evidence.mechanism_status.replaceAll("_", " ")}</p>}
    {(evidence.locator || evidence.derivation || evidence.source_refs?.length) ? <details>
      <summary>Evidence details & sources</summary>
      {evidence.locator && <p className="flight-mapping">Source location: {evidence.locator}</p>}
      {evidence.derivation && <p className="flight-mapping">Derivation: {evidence.derivation}</p>}
      {evidence.source_refs?.map((ref) => {
        const source = item.sources.find((candidate) => candidate.id === ref.id);
        return <p className="flight-source" key={ref.id} data-source-id={ref.id}>
          {source?.url ? <a href={source.url}>{source.title}</a> : source?.title ?? ref.id}
        </p>;
      })}
    </details> : null}
  </>;
}

/** Never summarize evidence for unrelated targets under one generic badge. */
export default function FlightEvidence({ item }: { item: ExplorerItem }) {
  const reference = item.display?.referenceClaim;
  return <>
    {item.display?.mode === "claim-reference" && <section aria-label="Reference coordinate evidence"
      data-claim-id={reference?.id} data-evidence-target={reference?.target}>
      <h3>Reference coordinate evidence</h3>
      {reference && <p className="flight-mapping" style={{ overflowWrap: "anywhere" }}>
        Claim: <code>{reference.id}</code><br />Target: <code>{reference.target}</code>
      </p>}
      <EvidenceDetails evidence={reference?.evidence} item={item} />
    </section>}
    {item.provenance.length > 0 && <section aria-label="Record provenance">
      <h3>Record provenance</h3>
      {item.provenance.map((entry, index) => <div key={`${entry.target}:${index}`} data-evidence-target={entry.target}>
        <p className="flight-mapping" style={{ overflowWrap: "anywhere" }}>Target: <code>{entry.target}</code></p>
        <EvidenceDetails evidence={entry.evidence} item={item} />
      </div>)}
    </section>}
  </>;
}
