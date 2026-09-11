# Recorded connections workspace

Focused #33 slice of #4 / #22 after merged #32. `/connections/` exposes the existing record-level graph outside curated physical journeys. The Flight corridor and its label budgets are unchanged.

## Interaction

Choose an original observation, inspect one incoming or outgoing link, then optionally continue from either endpoint. The same edge keeps its stored source/target direction when browsing from the opposite end. Category buttons filter links, not the scientific records. Search covers canonical names, subject aliases, domains and curated process names; it never fabricates a relationship. Empty searches and empty categories have recovery controls. An observation with no recorded links is not claimed to be physically unrelated to all other observations.

The primary navigation and shared record-evidence component link into the workspace. The latter preserves the canonical observation ID and adds no renderer or graph-index cost to Atlas/Flight: the index is loaded by the new route, not those entry links.

## Build and source boundary

`recorded-connections-data.ts` alone imports the build-time corpus. The pure `buildRecordedConnections` projection emits each stored relationship ID once, preserves differently typed edges on the same pair, and resolves every source reference in its **owner's** source namespace. It fails on duplicate IDs, missing referenced owner sources, an observation missing for a known record root, invalid scopes, or type/category mismatches. Sorting is deterministic by ID. Neither endpoint's evidence replaces the relationship evidence. Missing evidence/description/source lists are explicitly represented defensively; the scientific schema remains the authoritative validation boundary.

The UI compares only links whose two endpoints resolve to phenomenon roots. Local system/observable/detector and other node-level edges are retained in a separately counted list with links to their exact owning records. A node is never silently replaced by its owner to manufacture a record-to-record edge. An Atlas-scoped non-root node remains node-level, and an unscoped reference cannot resolve to another manifest root. Full graph/node resolution remains the existing scientific validator's responsibility.

No scientific manifest, schema, quantity, evidence status, relationship, dependency or workflow permission changes.

## Meaning and coordinates

Physical, mathematical, statistical, numerical, subjective and epistemic categories have distinct visible explanations. A stored physical category is not a new review decision; its original mechanism/review status is displayed. Numerical links explicitly warn that a matching number is not a shared mechanism. Hypothesized, disputed and refuted types keep their exact stored type. No generic process-flow claim is attached to an association's source-to-target arrow.

The A/B comparison reuses the pure Flight coordinate adapter and full-corpus scale, without importing Three.js. Original extents and actual spectral lines are shown; no midpoint is drawn as a measurement. Missing coordinates have no marks. Claim references and event rates keep their original qualifiers, native values and target-specific evidence. `connectionPlacement` handles spectral gaps rather than treating their envelopes as filled data. The positional explanation is category-neutral and is not a relationship generator.

The heart/watch case compares the **lower endpoint** of a resting-heart-rate range with the clock output. The chart deliberately shows each whole source record and explicitly says the stored explanation defines the compared subset; the original edge's description and derivation remain visible. It does not imply that the entire heart-rate range equals 1 Hz.

## State, access and validation

`entity`, `edge`, `kind` and `q` query parameters are validated against current data. An edge must touch the selected record and satisfy the category; foreign/unknown edge IDs do not silently display another pair. Query typing replaces the current history entry; deliberate record, edge and category selections push entries. Existing unrelated URL parameters, hashes and history state are retained. Back/forward and reload restore the original pair and browsing perspective.

Native selects, buttons, search and disclosures support keyboard/touch. A persistent polite status announces the selected pair. This is not a manual assistive-technology audit. A no-JavaScript section lists all record-level source/target/owner links and separately accounts for node-level edges.

Tests cover owner-local provenance, invalid and partial inputs, category safeguards, bidirectional browsing without edge reversal, URL recovery, synthetic line/reference/event semantics, no-source handling, browser navigation, mobile containment and shared Atlas/Flight entry links. Actual CI screenshots are reviewed and pinned in the PR, not treated as pixel-difference goldens.

## Still separate

Automatic candidate mining/scoring, candidate review workflow, whole-graph layout, additional curation, large-catalog rendering and Safari/manual accessibility validation. This workspace reads stored relationships; it does not propose new ones or complete #4.
