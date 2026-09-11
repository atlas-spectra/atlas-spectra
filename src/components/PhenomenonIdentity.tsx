import type { ExplorerItem } from "../lib/corpus";
import { identityFor, isCardiacObservation, type PhenomenonSymbol } from "../lib/phenomenon-identity";
import { itemCoordinate, MARK_LABELS } from "../lib/atlas-view";
import "../styles/phenomenon-identity.css";

/** Subject pictograms, not sampled waveforms, anatomical diagrams, or measured geometry. */
function Art({ symbol }: { symbol: PhenomenonSymbol }) {
  switch (symbol) {
    case "heart": return <><path d="M32 51C17 42 9 33 12 23c3-9 15-10 20-2 5-8 17-7 20 2 3 10-5 19-20 28Z" fill="currentColor" fillOpacity=".18" /><path d="M27 14V8h7v10m4-4 3-6 6 3-4 9M22 27c-4 5-1 12 6 17" /></>;
    case "artery": return <><path d="M11 19c13 4 24-4 41-1v26c-17-3-28 5-41 1Z" fill="currentColor" fillOpacity=".14" /><ellipse cx="12" cy="32" rx="5" ry="13" /><path d="M25 21c-4 8-4 16 0 22m15-24c-4 8-4 16 0 22M27 32h20m-6-5 6 5-6 5" /></>;
    case "electrodes": return <><path d="m23 12-10 6-4 29h46l-4-29-10-6M25 9c0 10 14 10 14 0" fill="currentColor" fillOpacity=".07" /><circle cx="19" cy="27" r="4" /><circle cx="46" cy="37" r="4" /><path d="m34 20-9 14h8l-2 11 10-16h-8l1-9Z" fill="currentColor" stroke="none" /><path d="M19 31v21m27-11v11" /></>;
    case "brain": return <><path d="M31 15c-4-8-15-4-15 3-9 0-12 12-5 17-5 8 3 17 10 14 2 6 10 6 11 0V17c2-9 14-8 16 0 8 1 11 12 4 17 6 7-1 17-9 15-2 6-10 5-11 0" fill="currentColor" fillOpacity=".1" /><path d="M19 22c7 0 9 5 6 9m-10 8c6-3 11 0 10 6m17-23c-5 1-7 6-4 9m9 8c-5-3-10 0-8 6" /></>;
    case "fork": return <><path d="M21 10v22a11 11 0 0 0 22 0V10M32 43v13" strokeWidth="4" /><path d="M13 15v13m38-13v13" opacity=".5" /></>;
    case "ear": return <><path d="M17 31c-6-25 34-29 32-5-1 12-14 12-15 21-2 11-15 10-17 0m7-21c0-13 20-13 20 0 0 7-9 7-10 13" /><path d="M50 46v-9l8-2v8m-8 3c-5-2-7 3-3 4 3 1 5-1 3-4" /></>;
    case "crystal": return <><path d="m24 9 15 2 10 20-13 24-20-13-2-21Z" fill="currentColor" fillOpacity=".12" /><path d="m24 9 2 23 10 23m3-44-4 20-9 1-10 10m19-11 14 0m-35-10 12 11" /></>;
    case "watch": return <><path d="m23 15 2-10h14l2 10m-18 34 2 10h14l2-10" /><rect x="16" y="14" width="32" height="36" rx="11" fill="currentColor" fillOpacity=".12" /><path d="M32 22v12l8 4M49 28h5v8h-5" /></>;
    case "molecule": return <><path d="m18 40 14-17 15 17" strokeWidth="4" /><circle cx="32" cy="22" r="8" fill="currentColor" fillOpacity=".18" /><circle cx="15" cy="43" r="9" /><circle cx="49" cy="43" r="9" /></>;
    case "atom": return <><ellipse cx="32" cy="32" rx="25" ry="10" /><ellipse cx="32" cy="32" rx="25" ry="10" transform="rotate(60 32 32)" /><ellipse cx="32" cy="32" rx="25" ry="10" transform="rotate(120 32 32)" /><circle cx="32" cy="32" r="4" fill="currentColor" /></>;
    case "eye": return <><path d="M6 32s10-16 26-16 26 16 26 16S48 48 32 48 6 32 6 32Z" fill="currentColor" fillOpacity=".08" /><circle cx="32" cy="32" r="10" /><circle cx="32" cy="32" r="3" fill="currentColor" /><path d="m20 11-3-5m15 3V3m12 8 3-5" /></>;
    case "light": return <><path d="m28 17 14 15-14 15V17Z" fill="currentColor" fillOpacity=".14" /><path d="M6 32h22m14 0h16M38 27l18-12M38 37l18 12M11 25l7 7-7 7" /></>;
    case "sensor": return <><rect x="17" y="11" width="30" height="42" rx="10" fill="currentColor" fillOpacity=".08" /><circle cx="32" cy="25" r="6" /><path d="M25 39h14m-7 0v7M8 21l-4-2m4 15-4 2m52-15 4-2m-4 15 4 2" /></>;
    case "nerve": return <><circle cx="24" cy="29" r="9" fill="currentColor" fillOpacity=".13" /><path d="m19 22-5-10m3 3-8 1m16 4 5-10m-14 20H5m15 7-8 12m10-5v10m12-25h15l9-12m-9 12 10 12m-9-12h10" /></>;
    case "cell": return <><path d="M20 20h24v22c0 15-24 15-24 0V20Z" fill="currentColor" fillOpacity=".12" /><path d="M23 20V10m6 10V6m6 14V9m6 11V5M25 59l7-5 7 5" /><circle cx="32" cy="37" r="5" /></>;
    case "synapse": return <><path d="M18 7v12c-12 5-8 13 14 13s26-8 14-13V7M14 48c4-9 32-9 36 0m-30 0v10m24-10v10" fill="currentColor" fillOpacity=".1" /><circle cx="23" cy="24" r="2" /><circle cx="34" cy="26" r="2" /><circle cx="29" cy="38" r="2" /><circle cx="41" cy="35" r="2" /></>;
    case "color": return <><circle cx="25" cy="26" r="15" fill="currentColor" fillOpacity=".07" /><circle cx="40" cy="26" r="15" fill="currentColor" fillOpacity=".14" /><circle cx="32" cy="40" r="15" fill="currentColor" fillOpacity=".07" /></>;
    case "gravity": return <><circle cx="24" cy="29" r="8" fill="currentColor" fillOpacity=".2" /><circle cx="43" cy="35" r="6" fill="currentColor" fillOpacity=".2" /><ellipse cx="32" cy="32" rx="26" ry="19" transform="rotate(20 32 32)" /><path d="M13 9c14-7 35 0 42 11M8 42c9 17 31 20 46 10" /></>;
    default: return <><rect x="14" y="8" width="36" height="48" rx="5" /><path d="M23 22h18m-18 10h18m-18 10h10" /></>;
  }
}

export function PhenomenonIcon({ item }: { item: ExplorerItem }) {
  const { symbol } = identityFor(item);
  return <span className="phenomenon-symbol" data-symbol={symbol} aria-hidden="true">
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" focusable="false"><Art symbol={symbol} /></svg>
  </span>;
}
export function phenomenonValue(item: ExplorerItem): string {
  // Show the original event-rate unit, not three indistinguishable normalized Hz labels.
  return item.profileType === "event_rate" && item.display ? item.display.nativeLabel : itemCoordinate(item);
}
export function PhenomenonFace({ item }: { item: ExplorerItem }) {
  const identity = identityFor(item);
  const qualifier = !item.display ? "Unpositioned" : item.display.mode === "claim-reference" ? "Reference"
    : item.profileType === "event_rate" ? "Event rate" : MARK_LABELS[item.markKind];
  return <span className="phenomenon-face" data-identity-id={item.id}>
    <PhenomenonIcon item={item} />
    <span className="phenomenon-copy"><strong className="phenomenon-title">{identity.title}</strong>
      <span className="phenomenon-subtitle">{identity.subtitle}</span>
      <span className="phenomenon-value">{phenomenonValue(item)}<span className="phenomenon-qualifier">{qualifier}</span></span>
    </span>
  </span>;
}

export function CardiacContext({ visibleItems }: { visibleItems: ExplorerItem[] }) {
  const records = visibleItems.filter((item) => isCardiacObservation(item.id));
  if (records.length < 2) return null;
  const first = records[0].display;
  const sameRange = first && records.every((item) => item.display?.lowHz === first.lowHz && item.display?.highHz === first.highHz);
  return <div className="atlas-family-context" role="note" aria-label="Different observations of heart activity">
    <strong>Heart activity, seen in different ways</strong>
    <span>{sameRange ? "These resting-adult references share a rate range, but count different events." : "Beat counts, pressure pulses, and electrical activations are different observations."} The icons show what is observed; the bars show how often.</span>
  </div>;
}
