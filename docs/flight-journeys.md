# Guided journeys inside Flight

Continues #22 after the quieter corridor in #28. Free Flight remains the default. **Follow a signal** optionally opens one of the existing validated journeys beside the instrument: cardiac sensing, sound to nerve, or quartz division. The existing heart-to-wearable link also starts the in-Flight guide; modified clicks retain its full-story link.

## One data source

`src/pages/flight.astro` imports the existing build-only `signalJourneys` and serializes a compact presentation projection. Steps reference canonical record IDs plus the system/observable descriptions already resolved by the journey builder. They do not serialize duplicate ExplorerItems, frequencies, scientific profiles or provenance inventories. Hops retain the original builder's owner-resolved source evidence. No scientific manifest, graph, schema, or dependency changes.

## Three separate states

- A journey/stage identifies the observation being followed.
- `at` is the camera's independent logarithmic scale position. It is not automatically a property of a visible or selected record.
- A saved browsing view contains the pre-journey camera, selected record, comparison mode, query and record-browser state.

Previous/next and the native stage selector explicitly select the corresponding original record and jump to its existing coordinate. Line spectra use a real nearest line. Unpositioned stages return no coordinate: the camera stays where it was and the guide explicitly states that its number does not describe that stage. A direct unknown-stage link without a camera coordinate uses the normal starting camera, not a copied frequency claim.

Stage order follows the curated edges, not ascending frequency. In particular, the quartz journey moves from 32,768 Hz to the one-second output. Equal cardiac rate references do not imply identical waveforms, simultaneous signals, or independent measurements. No connecting arcs, timing simulation, autoplay, invented geometry, or additional scene cards are introduced. Quiet scene-label caps remain in effect.

## Evidence

The selected inspector retains original quantities and target-specific observation evidence. A separate connection section shows the actual directed pair, type, category, description, mechanism status, basis, review status, derivation/locator and source references resolved from the edge's owning record. At the first stage it previews the outgoing edge; subsequent stages explain the incoming edge. Source URLs pass through the existing HTTP(S) filter.

## Navigation and history

Stable `journey` and `stage` IDs are written alongside `at`, `entity` and `detail`. A valid journey's stage is authoritative over a conflicting entity parameter. Unknown journeys return to free browsing; absent/foreign stages fall back to that journey's first valid stage. Explicit camera positions remain navigable even while a guide is active.

Discrete journey actions push history entries after flushing the prior debounced view. Scroll changes replace the current entry. Native browser back/forward restore the journey and camera without a page reload. History state holds a validated browsing snapshot, so **Return to browsing** restores the original view even after reloading the active journey. Fresh deep links have no prior browsing snapshot and leave the current view in place on exit. Unrelated manual record selection leaves the guide rather than showing misleading stage evidence for another record. Closing the inspector also ends guidance.

## Responsive and fallback behavior

On desktop the optional journey controls occupy the sidebar above the existing inspector; they never cover the corridor. On narrow layouts controls precede the instrument. Native controls remain keyboard/touch accessible, progress has a polite live region, and stepping does not repeatedly steal focus. Return focuses the journey picker. Reduced-motion and no-WebGL users retain all discrete controls and evidence. The static fallback links to the full no-JavaScript journeys page.

Model and real-browser regressions cover exact targets, unknown stages, history validation/restoration, source ownership, pointer/keyboard/mobile input, default label budgets, fallback and reduced motion. Browser captures are visual review evidence rather than pixel-difference goldens. Broader relationship overlays, additional narrative curation, renderer performance and manual Safari/assistive-technology audits remain separate work under #22 and #21.
