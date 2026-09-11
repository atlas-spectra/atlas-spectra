# A quieter Flight and a readable common scale

Continues #27 / PR #28 after visual review identified crowding despite collision-free cards.

## Hierarchy

The corridor uses compact icon/name labels, not floating inspectors. Discover shows at most three labels on desktop and two below 600px. All observations permits five / three. Reference labels retain their visible Claim reference qualifier; a grouped label retains its observation disclosure. Native quantities, full descriptions and provenance remain in the selected-record inspector and record browser.

`quietFlightPlan` reuses the established bounded, selected-first anchor planner. It shrinks 88px rectangles to 48px about the same centers and applies a lower label cap. Scientific anchors, spectral lines, scene geometry, full-model bounds and the whole-corpus overview are unchanged. This cap is an interface budget, not a whole-scene performance claim.

## Defer repetition, not records

The explicitly named `cardiac-sensing` journey supplies the two sensing-stage IDs outside the curated Heart activity facets. When its representative already qualifies for a visible default label, these two stage labels and default nearby recommendations are deferred to Follow the signal. Selecting any observation in that process/journey or entering All observations disables deferral. Search and Browse all always operate on canonical records. An absent or off-screen representative cannot suppress the sensing stages. No numerical matching, record merging, new edge or new group membership is involved. All geometry and overview marks remain present.

## Overview as navigator

The native range control sits on the whole-corpus diagram, not on a separate redundant ruler. It supports real pointer dragging, taps and keyboard controls. Named landmark shortcuts deliberately jump/select the canonical record; ranges display their native quantity, not the navigation midpoint. The explanatory label-depth window and counts move under About this view. The unmodified full-precision navigation coordinate remains in `at`; presentation rounding never writes back to it.

## Hz, event rates and the camera

The dominant readout says Your position on the scale and a value per second. Its smaller Hz-equivalent line retains the technical coordinate. Neither is assigned to every visible object. Forward landmarks can lie at other coordinates.

An event-rate inspector shows the original per-minute quantity alongside the adapter's per-second count, e.g. 60–100 beats/min and 1–1.67 beat events/s. This is division by 60, not a new measurement. The reference interval is not an amplitude spectrum, time track or assertion of evenly spaced events. Unknown coordinates and claim references never get invented event counts.

The visible unit-help disclosure cites NIST's explanation of cycles per second and the AHA's definition of beats per minute. For a regularly repeating signal, one cycle per second is 1 Hz; an average of one event per second need not imply a periodic signal. Equal numerical rates do not establish physical coupling.

## Verification

Preserve the existing 110 cases. Individual scene-card assertions now check compact geometry and reference disclosure; quantities are checked in the record browser and selected inspector rather than hidden duplicate DOM. New pure tests cover original anchors/objects, selected priority, density caps, explicit deferral, missing/off-screen representatives and unit semantics. Browser checks exercise real dragging/taps, named jumps, exact reload, distinct camera versus event-rate readouts, canonical sensor access and perceptual reference labels. Actual screenshots cover quiet desktop/mobile, the unified overview and unit explanations. No new dependencies or workflow permissions.
