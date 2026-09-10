import { useId, useMemo, type CSSProperties } from "react";
import type { ExplorerItem } from "../lib/corpus";
import { clamp, formatCoordinate, geometryFor, laneColor, type AtlasLayout, type AtlasView } from "../lib/atlas-view";
import { atlasLandmarks, distanceLabel, isInView, neighboringStops, neighborsAt, reciprocalLabel } from "../lib/atlas-neighborhood";
import { identityFor } from "../lib/phenomenon-identity";
import { groupForAnchor, groupMembers, type ProcessGroup } from "../lib/process-groups";
import { ProcessGroupFace } from "./ProcessGroup";
import { PhenomenonFace, PhenomenonIcon, phenomenonValue } from "./PhenomenonIdentity";
import "../styles/atlas-context.css";
import "../styles/atlas-context-refinements.css";

type Visit = (coordinate: number, id?: string) => void;
export function AtlasLandscape({ items, lanes, view, onVisit }: { items: ExplorerItem[]; lanes: string[]; view: AtlasView; onVisit: Visit }) {
  const landmarks = useMemo(() => atlasLandmarks(items), [items]);
  return <section className="atlas-landscape" aria-label="Scale landmarks">
    <div className="atlas-landscape-intro"><span>TAKE A CLOSER LOOK</span><h2>Rhythms. Signals. Different worlds.</h2><p>Choose a landmark, then explore what shares its part of the scale.</p></div>
    <div className="atlas-landmark-trail">{landmarks.map((landmark) => {
      const definition = groupForAnchor(landmark.item.id);
      const group = definition && groupMembers(definition, items).length === definition.facets.length ? definition : undefined;
      return <button type="button" key={landmark.item.id}
        data-context-landmark={landmark.item.id} data-in-view={isInView(landmark.item, view)}
        style={{ "--context-color": laneColor(landmark.item.lane, lanes) } as CSSProperties}
        onClick={() => onVisit(landmark.coordinate, landmark.item.id)} title={group ? `${group.title} · ${group.anchorLabel}` : landmark.item.name}>
        <PhenomenonIcon item={landmark.item} /><strong>{group?.title ?? landmark.label}</strong><small>{phenomenonValue(landmark.item)}{group && <><br />{group.anchorLabel}</>}</small>
      </button>;
    })}</div>
    <p className="atlas-landscape-note">Landmarks from this corpus—not continuous coverage of every frequency.</p>
  </section>;
}

export function AtlasProbeControls({ at, view, pinned, onProbe, onPin, onVisit }: {
  at: number; view: AtlasView; pinned: boolean; onProbe: (value: number) => void; onPin: () => void; onVisit: Visit;
}) {
  const id = useId();
  return <section className="atlas-probe-controls" aria-label="Frequency lens" data-probe-log={at}>
    <div className="atlas-probe-reading"><span>FREQUENCY LENS</span><strong>{formatCoordinate(at)}</strong><small>If periodic: one cycle every {reciprocalLabel(at)}</small></div>
    <div className="atlas-probe-input"><label htmlFor={id}>{pinned ? "Lens pinned · slide to inspect" : "Move over the chart or slide to inspect"}</label>
      <input id={id} aria-label="Inspect frequency" type="range" min={view.center - view.span / 2} max={view.center + view.span / 2}
        step="any" value={at} aria-valuetext={`${formatCoordinate(at)}, display coordinate`} onChange={(event) => onProbe(Number(event.target.value))} />
      <div><button type="button" aria-pressed={pinned} onClick={onPin}>{pinned ? "Release lens" : "Pin lens"}</button><button type="button" onClick={() => onVisit(at)}>Explore here ↗</button></div>
    </div>
  </section>;
}

export function AtlasNeighborhood({ items, lanes, at, view, activeIds, selectedId, selectedItem, groups, onVisit, onHover }: {
  items: ExplorerItem[]; lanes: string[]; at: number; view: AtlasView; activeIds: Set<string>; selectedId: string | null;
  selectedItem?: ExplorerItem | null; groups?: Map<string, ProcessGroup>;
  onVisit: Visit; onHover: (id: string | null) => void;
}) {
  const neighbors = useMemo(() => neighborsAt(items, at), [items, at]);
  const closest = neighbors[0], closestGroup = closest ? groups?.get(closest.item.id) : undefined;
  const selected = selectedItem ?? items.find((item) => item.id === selectedId);
  const { previous, next } = useMemo(() => neighboringStops(items, at), [items, at]);
  return <div className="atlas-neighborhood" aria-label="Frequency neighborhood">
    <div className="atlas-neighborhood-title"><span className="atlas-live-dot" aria-hidden="true" /><span>AROUND YOUR LENS</span></div>
    <h2>{formatCoordinate(at)}</h2>
    {closest ? <><p className="atlas-neighborhood-nearest">Nearest entry: <strong>{closestGroup?.title ?? identityFor(closest.item).title}</strong></p><p className="atlas-neighborhood-summary">{closestGroup?.summary ?? closest.item.summary}</p></> : <p>No positioned records are available.</p>}
    <div className="atlas-neighborhood-steps"><button type="button" disabled={previous === undefined} onClick={() => previous !== undefined && onVisit(previous)}>← Lower landmark</button><button type="button" disabled={next === undefined} onClick={() => next !== undefined && onVisit(next)}>Higher landmark →</button></div>
    <div className="atlas-neighbor-list">{neighbors.slice(0, selectedId ? 2 : 4).map((entry) => {
      const group = groups?.get(entry.item.id);
      return <button type="button" key={entry.item.id} data-neighbor-id={entry.item.id} data-group-id={group?.id}
        style={{ "--context-color": laneColor(entry.item.lane, lanes) } as CSSProperties} title={group?.title ?? entry.item.name}
        onClick={() => onVisit(entry.coordinate, entry.item.id)} onMouseEnter={() => onHover(entry.item.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(entry.item.id)} onBlur={() => onHover(null)}>
        <small>{distanceLabel(entry)}</small>{group ? <ProcessGroupFace group={group} anchor={entry.item} /> : <PhenomenonFace item={entry.item} />}
        <em>{entry.item.display?.mode === "claim-reference" ? "Claim reference · " : ""}{entry.item.lane}{!activeIds.has(entry.item.id) ? " · outside filter" : !isInView(entry.item, view) ? " · off screen" : ""}</em>
      </button>;
    })}</div>
    {selected && selected.relationships.length > 0 && <details className="atlas-neighborhood-why"><summary>What supports the selected record’s connections?</summary>
      {selected.relationships.map((edge) => <div key={edge.id}><strong>{edge.type.replaceAll("_", " ")}</strong><p>{edge.category} · mechanism: {(edge.evidence?.mechanism_status ?? "unspecified").replaceAll("_", " ")}</p>
        <p>{edge.evidence?.derivation ?? edge.evidence?.locator ?? "Inspect the full record and linked provenance for the relationship’s conditions and source context."}</p></div>)}
    </details>}
    <p className="atlas-context-caution">Neighbors use numerical display-coordinate distance. A grouped entry uses only its named reference observation; expand it for the other facets. Proximity does not establish a physical connection. The time ruler is 1/f, not a measured period.</p>
  </div>;
}

export function AtlasLensOverlay({ at, view, width, layout, items }: { at: number; view: AtlasView; width: number; layout: AtlasLayout; items: ExplorerItem[] }) {
  const id = useId(), g = geometryFor(width, view);
  const nearest = new Set(neighborsAt(items, at).slice(0, 4).map((entry) => entry.item.id));
  const x = g.x(clamp(at, g.min, g.max));
  const left = g.x(Math.max(g.min, at - 0.5)), right = g.x(Math.min(g.max, at + 0.5));
  return <svg className="atlas-context-overlay" width={width} height={layout.height} aria-hidden="true">
    <defs><linearGradient id={id}><stop offset="0" stopColor="#528f88" stopOpacity="0" /><stop offset=".5" stopColor="#528f88" stopOpacity=".13" /><stop offset="1" stopColor="#528f88" stopOpacity="0" /></linearGradient></defs>
    <rect x={left} y="35" width={Math.max(0, right - left)} height={layout.height - 70} fill={`url(#${id})`} />
    <line className="atlas-probe-line" x1={x} x2={x} y1="34" y2={layout.height - 35} /><path d={`M ${x - 4} 29 L ${x + 4} 29 L ${x} 35 Z`} fill="#397d76" />
    {layout.marks.filter((mark) => nearest.has(mark.item.id)).map((mark) => <circle key={mark.item.id} className="atlas-neighbor-halo" cx={mark.x} cy={mark.y} r="10" />)}
  </svg>;
}

/** Only existing, explicitly typed, directed edges are drawn. No proximity-generated edges. */
export function AtlasRecordedLinks({ selected, layout, width }: { selected: ExplorerItem | null; layout: AtlasLayout; width: number }) {
  const id = useId();
  if (!selected) return null;
  const own = layout.marks.find((mark) => mark.item.id === selected.id);
  if (!own) return null;
  return <svg className="atlas-context-overlay atlas-recorded-links" width={width} height={layout.height} aria-hidden="true">
    <defs><marker id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#41675f" /></marker></defs>
    {selected.relationships.map((edge) => {
      const peer = layout.marks.find((mark) => mark.item.id === edge.peerId);
      if (!peer) return null;
      const from = edge.direction === "outgoing" ? own : peer, to = edge.direction === "outgoing" ? peer : own;
      const bend = Math.max(from.x, to.x) < width - 110 ? 78 : -78;
      const labelX = clamp((from.x + to.x) / 2 + bend * 0.75, 100, width - 100);
      return <g key={edge.id} data-relationship-id={edge.id} data-category={edge.category}>
        <path d={`M${from.x},${from.y} C${from.x + bend},${from.y} ${to.x + bend},${to.y} ${to.x},${to.y}`}
          markerEnd={`url(#${id})`} strokeDasharray={edge.category === "physical" ? undefined : "4 5"} />
        <text x={labelX} y={(from.y + to.y) / 2 - 5} textAnchor="middle">{edge.category === "numerical" ? "NUMERICAL COINCIDENCE" : edge.type.replaceAll("_", " ")}</text>
        <title>{`${edge.type} · ${edge.category} · mechanism: ${edge.evidence?.mechanism_status ?? "unspecified"}`}</title>
      </g>;
    })}
    <text className="atlas-links-note" x={width / 2} y={layout.height - 40} textAnchor="middle">Arcs link records—not exact coordinate pairs. Inspect conditions & evidence.</text>
  </svg>;
}
