# 2D atlas workspace

This refines the precise Atlas view alongside Frequency Flight. Tracks #23 and continues #3; it does not close the broader explorer/performance work.

## One dataset, two views
The checked-in scientific manifests and `corpus.ts` adapter remain unchanged. `atlas-view.ts` is a pure layout/navigation layer. Neither it nor the 2D component imports Three.js or the Flight renderer. Flight's already-reviewed `FlightEvidence` component is reused to keep reference-claim evidence separate from target-specific record provenance.

## Visual grammar
Domain accents are categorical UI colors, not simulated wavelengths or evidence confidence. Points, real discrete lines, bands, spectrum extents, time-varying extents, and hollow/dashed references remain distinct. A time-varying extent has no fabricated diagonal trajectory. Discrete-line labels anchor to an actual visible line; hit targets never fill spectral gaps.

Globally empty lanes are omitted. Each visible record gets a label. Greedy interval packing allocates extra rows for overlapping labels/marks rather than discarding coincident records. Lateral position retains the original logarithmic coordinate; row offsets communicate only layout. Label rectangles are constrained to the plot at mobile widths. The cost is a taller chart in dense regions; this is a seed-corpus treatment, not a large-catalog performance claim.

## Navigation and filtering
The overview always displays the full corpus extent and outlines the current viewport. Its native range input recenters a zoomed view using mouse/touch or keyboard. Domain focus and search are combined filters. Fit all frames the complete corpus without clearing filters; Fit results frames positioned records in the active filter; Fit selection clears filters and frames that record. Empty/unresolved-only results disable fitting instead of inventing coordinates.

Clicking a plot mark or label selects without unexpectedly moving the camera. Search/catalog/relationship navigation frames the selected record. Unpositioned selections leave the camera untouched. All records remain accessible in the record browser. Native values, actual transforms, typed connections, and evidence sources remain inspectable.

`center`, `span`, `entity`, and `lane` restore from the URL. Numeric values round-trip without truncation; malformed values use a bounded fallback. Search is transient, not part of the URL. URL writes are debounced and initialization is gated to avoid overwriting an incoming link.

Wheel listeners are explicitly non-passive and normalize deltaMode. Horizontal trackpad input pans; vertical wheel input zooms. Browser Ctrl-wheel zoom is not consumed. Pointer drag captures only the primary left/touch pointer and cancels cleanly. `touch-action: pan-y pinch-zoom` preserves vertical page scrolling and browser magnification on touch devices; the ruler/buttons provide discrete alternatives. There is no animation loop or automatic motion.

## Regression and visual review
Run `npm run check && npm run build && npm run test:visual`. The existing 2D stress tests and Flight suite remain in place. Additional pure tests cover exact bounds/URL values, real-line visibility and hits, invalid data, domain matching, and collision packing. Browser tests cover all seed labels, domain focus, fit controls, targeted evidence, search, unpositioned inspection, overview keyboard input, wheel/page behavior, and native mobile scrolling.

The regular trusted visual-evidence publisher attaches screenshots to its separate branch. Embed immutable screenshot links tied to the tested source SHA in the PR. These are behavior regressions and review screenshots, not pixel-difference goldens.

## Input references
- https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaMode
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
