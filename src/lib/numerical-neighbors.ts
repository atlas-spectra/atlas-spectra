import type { DisplayPosition, ExplorerItem, Manifest, Quantity } from "./corpus";

export type NumericRange = [number, number];
export const NUMERICAL_MAX_RECORDS = 2_000;
export const NUMERICAL_MAX_SEGMENTS = 128;
export interface NumericalInput {
  id: string;
  name: string;
  profileType: string;
  axisKind: string;
  coordinateMode: DisplayPosition["mode"] | null;
  nativeLabel: string;
  coordinateNote: string;
  quantityTargets: string[];
  segmentsHz: NumericRange[];
  status: "eligible" | "unpositioned" | "unsupported";
  reason: string | null;
}
export interface NumericalMatch {
  peer: NumericalInput;
  kind: "same-extent" | "boundary-only" | "shared-points" | "overlapping-extents";
  intersections: Array<{ anchorHz: NumericRange; peerHz: NumericRange; sharedHz: NumericRange }>;
}
export interface NumericalReport {
  schemaVersion: "0.1.0";
  method: "documented-coordinate-intersection-v1";
  interpretation: "numerical-only";
  reviewStatus: "unreviewed-computation";
  status: "complete" | "anchor-required" | "anchor-excluded" | "catalog-limit" | "invalid-catalog";
  anchorId: string | null;
  includeReferences: boolean;
  anchor: NumericalInput | null;
  reason: string | null;
  counts: { catalogRecords: number; comparedPeers: number; excludedPeers: number; matches: number };
  matches: NumericalMatch[];
  exclusions: Array<{ id: string; reason: string }>;
}
export interface NumericalState { anchorId: string | null; includeReferences: boolean; }
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const validRange = (r: NumericRange) => r.length === 2 && positive(r[0]) && positive(r[1]) && r[0] <= r[1];
function validQuantity(q: Quantity | undefined): boolean {
  if (!q || typeof q.unit !== "string" || !q.unit.trim()) return false;
  if (q.value !== undefined) return positive(q.value) && q.lower === undefined && q.upper === undefined;
  return positive(q.lower) && positive(q.upper) && q.lower <= q.upper;
}
function union(ranges: NumericRange[]): NumericRange[] {
  const sorted = ranges.map(([a, b]): NumericRange => [a, b]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const result: NumericRange[] = [];
  for (const range of sorted) {
    const last = result.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else result.push(range);
  }
  return result;
}
/** Build-time only. The existing adapter supplies conversions; validate the original
 * quantities before treating its display geometry as numerical input. In particular,
 * ranged spectral lines must never be replaced by the adapter's navigation midpoint.
 * This is an intersection of documented coordinates, not spectral power or causation.
 */
export function buildNumericalInputs(manifests: Manifest[], items: ExplorerItem[]): NumericalInput[] {
  const byId = new Map(manifests.map((m) => [m.id, m]));
  if (byId.size !== manifests.length || new Set(items.map((i) => i.id)).size !== items.length || items.length !== manifests.length) throw new Error("Numerical projection requires unique, matching record IDs");
  return items.map((item): NumericalInput => {
    const m = byId.get(item.id);
    if (!m) throw new Error(`Missing numerical source record: ${item.id}`);
    const d = item.display, p = m.frequency_profile;
    const input: NumericalInput = { id: item.id, name: item.name, profileType: item.profileType,
      axisKind: item.axisKind, coordinateMode: d?.mode ?? null, nativeLabel: d?.nativeLabel ?? "Unresolved",
      coordinateNote: d?.note ?? "No supported common-scale coordinate is assigned.", quantityTargets: [], segmentsHz: [],
      status: "eligible", reason: null };
    const exclude = (reason: string, status: NumericalInput["status"] = "unsupported") => ({ ...input, status, reason });
    if (!d) return exclude("No supported common-scale coordinate is assigned.", "unpositioned");
    if (item.profileType !== p.type || item.axisKind !== (p.axis?.kind ?? "other")) return exclude("Profile metadata does not agree with its source record.");
    if (!["native", "normalized", "transformed", "claim-reference"].includes(d.mode) || !validRange([d.lowHz, d.highHz])) return exclude("Invalid or unsupported display coordinate.");
    let quantities: Array<{ q: Quantity | undefined; target: string }> = [];
    if (d.mode === "claim-reference") {
      const match = /^\/claims\/(\d+)\/object$/.exec(d.referenceClaim?.target ?? "");
      const claim = match ? m.claims?.[Number(match[1])] : undefined;
      if (p.type !== "unknown" || !claim || claim.id !== d.referenceClaim?.id || !claim.object || typeof claim.object !== "object" || Array.isArray(claim.object)) return exclude("The navigational claim target cannot be verified.");
      quantities = [{ q: claim.object as Quantity, target: d.referenceClaim!.target }];
    } else if (p.type === "discrete_lines") {
      const lines = p.lines ?? [];
      if (!lines.length || lines.length > NUMERICAL_MAX_SEGMENTS) return exclude("Spectral line count is empty or exceeds the numerical limit.");
      if (lines.some((l) => !validQuantity(l.position) || l.position?.value === undefined)) return exclude("Ranged or invalid spectral lines require a richer projection; display midpoints are not compared.");
      if (!d.positionsHz || d.positionsHz.length !== lines.length || !d.positionsHz.every(positive)) return exclude("The complete list of original line coordinates is unavailable.");
      if (Math.min(...d.positionsHz) !== d.lowHz || Math.max(...d.positionsHz) !== d.highHz) return exclude("Spectral line coordinates disagree with the documented extent.");
      quantities = lines.map((line, i) => ({ q: line.position, target: `/frequency_profile/lines/${i}/position` }));
    } else {
      let field: "fundamental" | "range" | "center" | "rate" | "transition_frequency" | "characteristic_band";
      switch (p.type) {
        case "periodic": field = "fundamental"; break;
        case "quasi_periodic": field = p.range ? "range" : "center"; break;
        case "event_rate": field = "rate"; break;
        case "quantum_transition": field = "transition_frequency"; break;
        case "transient": field = "characteristic_band"; break;
        case "frequency_band": case "continuous_spectrum": case "time_varying": case "stochastic_process": field = "range"; break;
        default: return exclude("This profile has no supported numerical comparison quantity.");
      }
      quantities = [{ q: p[field], target: `/frequency_profile/${field}` }];
    }
    if (quantities.some(({ q }) => !validQuantity(q))) return exclude("A source quantity is missing, reversed, nonpositive or not finite.");
    input.quantityTargets = quantities.map(({ target }) => target);
    input.segmentsHz = p.type === "discrete_lines" && d.mode !== "claim-reference"
      ? union(d.positionsHz!.map((n) => [n, n])) : [[d.lowHz, d.highHz]];
    return input;
  }).sort((a, b) => compare(a.id, b.id));
}
function validInput(input: NumericalInput): boolean {
  if (!input.id.trim() || !["eligible", "unpositioned", "unsupported"].includes(input.status)) return false;
  if (input.status !== "eligible") return input.segmentsHz.length === 0 && !!input.reason;
  return input.reason === null && input.quantityTargets.length > 0 && input.coordinateMode !== null
    && ["native", "normalized", "transformed", "claim-reference"].includes(input.coordinateMode)
    && input.segmentsHz.length > 0 && input.segmentsHz.length <= NUMERICAL_MAX_SEGMENTS
    && input.segmentsHz.every((r, i) => validRange(r) && (i === 0 || r[0] > input.segmentsHz[i - 1][1]));
}
function intersect(a: NumericalInput, b: NumericalInput): NumericalMatch | null {
  const intersections: NumericalMatch["intersections"] = [];
  let i = 0, j = 0;
  while (i < a.segmentsHz.length && j < b.segmentsHz.length) {
    const x = a.segmentsHz[i], y = b.segmentsHz[j];
    const low = Math.max(x[0], y[0]), high = Math.min(x[1], y[1]);
    if (low <= high) intersections.push({ anchorHz: [...x], peerHz: [...y], sharedHz: [low, high] });
    if (x[1] <= y[1]) i++;
    if (y[1] <= x[1]) j++;
  }
  if (!intersections.length) return null;
  const same = JSON.stringify(a.segmentsHz) === JSON.stringify(b.segmentsHz);
  const points = intersections.every((entry) => entry.sharedHz[0] === entry.sharedHz[1]);
  const boundary = points && intersections.every(({ anchorHz, peerHz, sharedHz: [v] }) =>
    [anchorHz, peerHz].some(([low, high]) => low < high && (v === low || v === high)));
  return { peer: b, kind: same ? "same-extent" : boundary ? "boundary-only" : points ? "shared-points" : "overlapping-extents", intersections };
}
/** Deterministic, exact floating-point interval comparison. No tolerances, scores,
 * significance claims, harmonic guesses, graph mutation or evidence promotion.
 * Includes the number of tested peers and explicit exclusions in the report.
 */
export function findNumericalNeighbors(inputs: NumericalInput[], state: NumericalState): NumericalReport {
  const report: NumericalReport = { schemaVersion: "0.1.0", method: "documented-coordinate-intersection-v1",
    interpretation: "numerical-only", reviewStatus: "unreviewed-computation", status: "complete",
    anchorId: state.anchorId, includeReferences: state.includeReferences, anchor: null, reason: null,
    counts: { catalogRecords: inputs.length, comparedPeers: 0, excludedPeers: 0, matches: 0 }, matches: [], exclusions: [] };
  if (inputs.length > NUMERICAL_MAX_RECORDS) return { ...report, status: "catalog-limit", reason: "Catalog exceeds the interactive numerical-comparison limit; no partial match list is shown." };
  if (new Set(inputs.map((i) => i.id)).size !== inputs.length || inputs.some((i) => !validInput(i))) return { ...report, status: "invalid-catalog", reason: "Numerical inputs are inconsistent; no match list is shown." };
  const anchor = inputs.find((i) => i.id === state.anchorId) ?? null;
  report.anchor = anchor;
  if (!anchor) return { ...report, status: "anchor-required", reason: "Choose a valid observation." };
  const excluded = (input: NumericalInput) => input.status !== "eligible" ? input.reason
    : input.coordinateMode === "claim-reference" && !state.includeReferences ? "Navigational claim references are excluded by the current setting." : null;
  const anchorReason = excluded(anchor);
  if (anchorReason) return { ...report, status: "anchor-excluded", reason: anchorReason };
  for (const input of [...inputs].sort((a, b) => compare(a.id, b.id))) {
    if (input.id === anchor.id) continue;
    const reason = excluded(input);
    if (reason) { report.exclusions.push({ id: input.id, reason }); continue; }
    report.counts.comparedPeers++;
    const match = intersect(anchor, input);
    if (match) report.matches.push(match);
  }
  report.counts.excludedPeers = report.exclusions.length;
  report.counts.matches = report.matches.length;
  return report;
}
const PARAMS = ["numbers", "numbers_from", "numbers_refs"] as const;
export function readNumericalState(search: string, ids: ReadonlySet<string>): NumericalState | null {
  const p = new URLSearchParams(search);
  if (p.get("numbers") !== "overlap") return null;
  const id = p.get("numbers_from");
  return { anchorId: id && ids.has(id) ? id : null, includeReferences: p.get("numbers_refs") === "include" };
}
export function numericalSearch(search: string, state: NumericalState | null): string {
  const p = new URLSearchParams(search);
  for (const key of PARAMS) p.delete(key);
  if (state) { p.set("numbers", "overlap"); if (state.anchorId) p.set("numbers_from", state.anchorId); if (state.includeReferences) p.set("numbers_refs", "include"); }
  return p.toString();
}
