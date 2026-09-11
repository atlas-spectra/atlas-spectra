# Numerical neighbors: documented-coordinate intersection v1

An opt-in panel in Connections compares one observation with the current catalog. It is the first numerical-discovery baseline of #4, not an accepted-edge generator. **Numerical comparisons are never inserted into the recorded graph or path finder.**

## What the calculation means

For each pair of documented intervals, compute `[max(A.low, B.low), min(A.high, B.high)]`. It is an intersection only when the lower result does not exceed the upper result. Closed endpoints can therefore produce a single boundary match. Actual spectral lines are zero-width intervals; gaps remain gaps. Inputs and intersection witnesses are preserved in a versioned report.

The categories are same documented extent, boundary-only match, shared discrete coordinates, and overlapping documented extents. None means identical waveforms, independent measurements, phase locking, integrated spectral-power overlap, physical coupling or statistical significance. A reported range can be a reference population interval, response-curve domain or time-varying envelope, not simultaneous spectral support. Read the original observation and its conditions. Related observations may reuse one reference range.

The matcher compares exact adapter-produced floating-point coordinates, with no approximate tolerance or rounding before comparison. It is deliberately conservative: rounding or uncertainty can prevent an otherwise meaningful overlap. It does not infer physical dimensional compatibility merely because quantities share the numerical per-second display axis. Event counts, transformed coordinates and claim references stay visibly distinct. Claim references require explicit opt-in, for the anchor as well as peers.

## Input boundary

`buildNumericalInputs` runs at build time against the scientific manifests and the shared display adapter. It checks unique corresponding IDs, original quantity fields, claim targets, finite positive ordered coordinates and complete line lists. It records exact quantity JSON pointers and conversion notes. Ranged spectral lines are explicitly excluded: their navigation midpoints must not become scientific comparison data. Missing, invalid or unsupported observations are accounted for, not assigned invented values. Existing scientific schema/corpus validation remains authoritative for units and full reference resolution.

The computation is bounded to 2,000 inputs and 128 original line positions per input. Exceeding the catalog limit returns a distinct result, not a partial match list. Result cards are paged in groups of eight; the report contains every match and exclusion. Stable record-ID ordering is not confidence or importance ranking. Compared-peer counts describe the performed search, not a multiple-testing correction; no p-value or significance is claimed.

## Reproducibility and evidence

`schema/numerical-neighbor-report.schema.json` describes the computation report, separately from the scientific ontology. It carries the method/version, numerical-only interpretation, unreviewed-computation label, anchor/peer snapshots, quantity targets, intersection witnesses, counts and exclusions. Snapshots preserve the exact numerical inputs used, not immutable copies of the entire source dataset or a review decision. The original observation pages contain source evidence; the panel shows original evidence separately and links existing recorded edges without synthesizing one.

A synthetic deterministic fixture is checked both against the actual TypeScript output and the Python JSON Schema validator. Export uses a local JSON Blob, never an upload or a graph write. Schema validation is structural; interval arithmetic, target selection, classification and counts have separate model tests.

## Interaction

The panel starts closed. Opening uses the current single-link browser observation from the URL. Subsequent numerical anchor changes are independent of pair/path selections. `numbers`, `numbers_from`, and `numbers_refs` are the only owned parameters; closing and back/forward preserve other state. Invalid IDs remain unselected and malformed reference settings stay restrictive. Page changes are local and reset with the numerical query. Native links into existing recorded edges retain the numerical query and use the pair detail anchor. Keyboard/touch controls and focus recovery require no hover or WebGL.

No scientific manifest, existing ontology, package dependency, renderer or workflow permission changes are required. Harmonic/near matches, all-pairs mining, worker-scale performance, candidate review persistence and automatic edge acceptance are future slices.
