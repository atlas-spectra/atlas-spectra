const SPEED_OF_LIGHT_M_S = 299_792_458;

export interface Quantity { value?: number; lower?: number; upper?: number; unit?: string; quantity_kind?: string; }
interface Axis { kind: string; notes?: string; }
interface Line { position?: Quantity; }
interface FrequencyProfile { type: string; axis?: Axis; fundamental?: Quantity; center?: Quantity; range?: Quantity; lines?: Line[]; rate?: Quantity; transition_frequency?: Quantity; characteristic_band?: Quantity; representation?: string; constraints?: string[]; }
interface Evidence { basis?: string; review_status?: string; mechanism_status?: string; locator?: string; derivation?: string; source_refs?: Array<{ id: string }>; }
interface Relationship { id: string; type: string; category: string; source_ref: { id: string; scope?: string }; target_ref: { id: string; scope?: string }; evidence?: Evidence; }
interface Claim { id: string; predicate?: string; object?: unknown; evidence?: Evidence; }
interface Source { id: string; title: string; type?: string; publisher?: string; url?: string; doi?: string; }
interface Provenance { target: string; evidence: Evidence; }
export interface Manifest { schema_version: string; id: string; name: string; summary: string; domains: string[]; system?: { id: string; name?: string; type?: string }; observable?: { id: string; name?: string; quantity_kind?: string; independent_coordinate?: string }; frequency_profile: FrequencyProfile; relationships?: Relationship[]; claims?: Claim[]; sources?: Source[]; provenance?: Provenance[]; tags?: string[]; }
export type MarkKind = "point" | "band" | "lines" | "spectrum" | "chirp" | "reference";
export interface DisplayPosition { lowHz: number; highHz: number; positionsHz?: number[]; mode: "native" | "normalized" | "transformed" | "claim-reference"; note: string; nativeLabel: string; }
export interface ExplorerRelationship { id: string; type: string; category: string; direction: "outgoing" | "incoming"; peerId: string; peerName: string; evidence?: Evidence; }
export interface ExplorerItem { id: string; name: string; summary: string; domains: string[]; lane: string; profileType: string; axisKind: string; markKind: MarkKind; display: DisplayPosition | null; sources: Source[]; provenance: Provenance[]; relationships: ExplorerRelationship[]; manifest: Manifest; }

const rawModules = import.meta.glob("../../examples/*.json", { eager: true, import: "default" }) as Record<string, Manifest>;
export const manifests = Object.values(rawModules).sort((a, b) => a.name.localeCompare(b.name));
const manifestById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
const LANE_ORDER = ["Event processes", "Biological", "Neural & perceptual", "Mechanical & acoustic", "Electrical & timekeeping", "Molecular", "Optical", "Atomic & quantum", "Astronomical", "Other"] as const;
export const lanes = [...LANE_ORDER];

function laneFor(manifest: Manifest): string {
  const domains = new Set(manifest.domains.map((domain) => domain.toLowerCase()));
  const axisKind = manifest.frequency_profile.axis?.kind;
  if (domains.has("astronomy") || domains.has("astrophysics") || domains.has("relativity") || domains.has("gravitational-wave") || manifest.id.startsWith("astronomy.") || manifest.id.startsWith("gravity.")) return "Astronomical";
  if (domains.has("atomic") || domains.has("quantum") || manifest.id.startsWith("atomic.")) return "Atomic & quantum";
  if (axisKind === "wavelength" || domains.has("optical") || domains.has("color-science") || domains.has("photometry")) return "Optical";
  if (domains.has("molecular") || domains.has("spectroscopy") || domains.has("infrared")) return "Molecular";
  if (domains.has("electronics") || domains.has("electrical") || domains.has("timekeeping") || domains.has("clocks")) return "Electrical & timekeeping";
  if (domains.has("acoustics") || domains.has("sound") || domains.has("music")) return "Mechanical & acoustic";
  if (domains.has("neuroscience") || domains.has("hearing") || domains.has("vision") || domains.has("perception") || domains.has("psychoacoustics")) return "Neural & perceptual";
  if (domains.has("biology") || domains.has("cardiology") || domains.has("physiology") || domains.has("biological")) return "Biological";
  if (axisKind === "event_rate") return "Event processes";
  return "Other";
}
function finitePositive(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value > 0; }
function bounds(quantity: Quantity | undefined): [number, number] | null { if (!quantity) return null; if (finitePositive(quantity.value)) return [quantity.value, quantity.value]; if (finitePositive(quantity.lower) && finitePositive(quantity.upper)) return quantity.lower <= quantity.upper ? [quantity.lower, quantity.upper] : [quantity.upper, quantity.lower]; return null; }
function unitScale(unit: string | undefined): number | null { switch ((unit ?? "").trim()) { case "Hz": case "s^-1": case "1/s": case "events/s": return 1; case "kHz": return 1e3; case "MHz": return 1e6; case "GHz": return 1e9; case "THz": return 1e12; case "bpm": case "beats/min": case "events/min": return 1 / 60; default: return null; } }
function wavelengthScale(unit: string | undefined): number | null { switch ((unit ?? "").trim()) { case "m": return 1; case "cm": return 1e-2; case "mm": return 1e-3; case "um": case "µm": return 1e-6; case "nm": return 1e-9; default: return null; } }
function wavenumberScale(unit: string | undefined): number | null { switch ((unit ?? "").trim()) { case "m^-1": case "1/m": return 1; case "cm^-1": case "1/cm": return 100; default: return null; } }
function nativeLabel(quantity: Quantity | undefined): string { const b = bounds(quantity); if (!b || !quantity?.unit) return "Unresolved"; return b[0] === b[1] ? `${b[0]} ${quantity.unit}` : `${b[0]}–${b[1]} ${quantity.unit}`; }
function convertQuantity(quantity: Quantity | undefined, axisKind: string): DisplayPosition | null {
  const b = bounds(quantity); if (!b) return null;
  if (axisKind === "temporal_frequency") { const scale = unitScale(quantity?.unit); if (!scale) return null; return { lowHz: b[0] * scale, highHz: b[1] * scale, mode: scale === 1 ? "native" : "normalized", note: scale === 1 ? "Native temporal-frequency coordinate" : "Unit-normalized temporal frequency", nativeLabel: nativeLabel(quantity) }; }
  if (axisKind === "event_rate") { const scale = unitScale(quantity?.unit); if (!scale) return null; return { lowHz: b[0] * scale, highHz: b[1] * scale, mode: "normalized", note: "Event rate normalized to events per second for display; it is not reclassified as an oscillator", nativeLabel: nativeLabel(quantity) }; }
  if (axisKind === "angular_frequency") { if ((quantity?.unit ?? "").trim() !== "rad/s") return null; return { lowHz: b[0] / (2 * Math.PI), highHz: b[1] / (2 * Math.PI), mode: "transformed", note: "Angular frequency transformed to cycles per second using f = ω / 2π", nativeLabel: nativeLabel(quantity) }; }
  if (axisKind === "wavelength") { const scale = wavelengthScale(quantity?.unit); if (!scale) return null; return { lowHz: SPEED_OF_LIGHT_M_S / (b[1] * scale), highHz: SPEED_OF_LIGHT_M_S / (b[0] * scale), mode: "transformed", note: "Wavelength mapped to equivalent vacuum electromagnetic frequency using f = c / λ", nativeLabel: nativeLabel(quantity) }; }
  if (axisKind === "wavenumber") { const scale = wavenumberScale(quantity?.unit); if (!scale) return null; return { lowHz: SPEED_OF_LIGHT_M_S * b[0] * scale, highHz: SPEED_OF_LIGHT_M_S * b[1] * scale, mode: "transformed", note: "Wavenumber mapped to equivalent vacuum electromagnetic frequency using f = c·k", nativeLabel: nativeLabel(quantity) }; }
  return null;
}
function profilePosition(manifest: Manifest): DisplayPosition | null {
  const profile = manifest.frequency_profile; const axisKind = profile.axis?.kind ?? "other";
  switch (profile.type) {
    case "periodic": return convertQuantity(profile.fundamental, axisKind);
    case "quasi_periodic": return convertQuantity(profile.range ?? profile.center, axisKind);
    case "discrete_lines": { const positions = (profile.lines ?? []).map((line) => convertQuantity(line.position, axisKind)).filter((position): position is DisplayPosition => position !== null); if (!positions.length) return null; const values = positions.flatMap((position) => [position.lowHz, position.highHz]); return { lowHz: Math.min(...values), highHz: Math.max(...values), positionsHz: positions.map((position) => (position.lowHz + position.highHz) / 2), mode: positions.some((position) => position.mode === "transformed") ? "transformed" : "native", note: positions[0].note, nativeLabel: (profile.lines ?? []).map((line) => nativeLabel(line.position)).join(", ") }; }
    case "continuous_spectrum": case "frequency_band": case "time_varying": case "stochastic_process": return convertQuantity(profile.range, axisKind);
    case "event_rate": return convertQuantity(profile.rate, axisKind);
    case "quantum_transition": return convertQuantity(profile.transition_frequency, axisKind);
    case "transient": return convertQuantity(profile.characteristic_band, axisKind);
    default: return null;
  }
}
function quantityLike(value: unknown): Quantity | null { if (!value || typeof value !== "object" || Array.isArray(value)) return null; const candidate = value as Quantity; return bounds(candidate) ? candidate : null; }
function claimReferencePosition(manifest: Manifest): DisplayPosition | null { if (manifest.frequency_profile.type !== "unknown") return null; for (const claim of manifest.claims ?? []) { const quantity = quantityLike(claim.object); if (!quantity) continue; const scale = unitScale(quantity.unit); const b = bounds(quantity); if (!scale || !b) continue; return { lowHz: b[0] * scale, highHz: b[1] * scale, mode: "claim-reference", note: "Frequency-like claim reference used for navigation; this is not the physical spectrum of the phenomenon", nativeLabel: nativeLabel(quantity) }; } return null; }
function markKindFor(manifest: Manifest, display: DisplayPosition | null): MarkKind { if (display?.mode === "claim-reference") return "reference"; switch (manifest.frequency_profile.type) { case "periodic": case "event_rate": case "quantum_transition": return display && display.lowHz !== display.highHz ? "band" : "point"; case "discrete_lines": return "lines"; case "continuous_spectrum": case "stochastic_process": return "spectrum"; case "time_varying": return "chirp"; default: return "band"; } }
function relationshipList(manifest: Manifest): ExplorerRelationship[] { const relationships: ExplorerRelationship[] = []; for (const owner of manifests) for (const relationship of owner.relationships ?? []) { const sourceId = relationship.source_ref.id; const targetId = relationship.target_ref.id; if (sourceId !== manifest.id && targetId !== manifest.id) continue; const outgoing = sourceId === manifest.id; const peerId = outgoing ? targetId : sourceId; relationships.push({ id: relationship.id, type: relationship.type, category: relationship.category, direction: outgoing ? "outgoing" : "incoming", peerId, peerName: manifestById.get(peerId)?.name ?? peerId, evidence: relationship.evidence }); } return relationships.sort((a, b) => a.type.localeCompare(b.type) || a.peerName.localeCompare(b.peerName)); }
export const explorerItems: ExplorerItem[] = manifests.map((manifest) => { const display = profilePosition(manifest) ?? claimReferencePosition(manifest); return { id: manifest.id, name: manifest.name, summary: manifest.summary, domains: manifest.domains, lane: laneFor(manifest), profileType: manifest.frequency_profile.type, axisKind: manifest.frequency_profile.axis?.kind ?? "other", markKind: markKindFor(manifest, display), display, sources: manifest.sources ?? [], provenance: manifest.provenance ?? [], relationships: relationshipList(manifest), manifest }; });
export function getPhenomenon(id: string): ExplorerItem | undefined { return explorerItems.find((item) => item.id === id); }
