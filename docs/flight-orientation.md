# Recognizable Flight landmarks and local orientation

Continues #21 in the focused slice #27. The 3D route uses the same explicit process registry as the 2D Atlas. Discover groups the three core cardiac observations under Heart activity. All observations restores their separate markers. Search and Browse all still expose every canonical record, including unpositioned records. No membership is inferred from numerical equality.

## Stable scientific and scene coordinates

The full Flight model is built once. Display projections filter its original record objects, preserving the full-corpus bounds and ID-stable lateral offsets. A collapsed group retains its named anchor observation's coordinate; it has no aggregate extent or frequency. Selection expands that group. Group-label expansion, panel facet selection and collapse do not move the camera; catalog/search navigation deliberately moves to the requested supported coordinate. The original evidence and native values remain in the inspector and shared observation panel.

The comparison mode uses `detail=observations`; canonical entity and full-precision `at` URL state remain intact. Links from Flight to Atlas no longer round the center to four decimal places. Unpositioned selection does not move the camera and does not offer a fabricated return coordinate.

## Label planning

Labels use recognizable subject icons, short names, an observable description, the existing displayed quantity, and an explicit reference/event/profile qualifier. Canonical names remain available as accessible names and titles. Pictograms are subject identifiers, not measured shapes or waveform samples.

`planFlightLabels` scans projected anchors and retains a deterministic pool of at most 64 candidates. Selected records rank first; ties use numerical anchor distance then canonical ID. Layout attempts alternate vertical slots and both sides rather than dropping a colliding label immediately. Its fixed 88px rectangles exclude the top 134px readout area and bottom 42px footer. There are at most four labels below 600px and seven otherwise. Positions change only the label rectangles; leader lines retain their true projected anchors. Spectral labels keep actual listed line coordinates.

This is a bounded label-layout policy, not virtualization of the Three.js scene. Every canonical record remains in the search/browse data, and the rendering model still uses individual scene objects.

## Orientation

The overview contains all source observations and the label-depth window, derived from the existing camera-distance/projection limits and four-decade label neighborhood. It is explicitly not an exact outline of every rendered object: lateral clipping, fog, collisions and the label budget can prevent labels inside the window. The ruler is the keyboard/touch input; the SVG is decorative and has a textual equivalent.

Record-browser statuses distinguish labeled anchors, depth-window entries with no label, entries ahead/behind that window, and unpositioned records. A selected positioned record outside the visible label set gets Return to selection. Live status announces selection changes, not every frame of scroll movement. WebGL fallback and reduced-motion behavior remain available.

## Validation and performance scope

Existing scientific and browser regressions remain. Additional pure tests verify dense collisions, rectangle containment, priority beyond the candidate cap, unchanged original objects and coordinates, real line anchors, invalid geometry and depth-window statuses. Browser tests cover process disclosure, source-specific evidence, precise URL restoration, actual label boxes, selection recovery, canonical search/global browsing, and mobile taps.

`flight-label-layout.spec.ts` prints `FLIGHT_LABEL_BENCHMARK` JSON for 1,000 and 10,000 synthetic records competing in a dense local window: five warmups and thirty measured iterations at 900×570. Fixture construction and assertions are outside the measured interval. Time measurements are informational because shared CI runner scheduling is variable; candidate/label count limits are hard assertions.

These measurements cover only the pure planner in the test process. They do not measure WebGL frame rate, browser startup, payload, memory, draw calls, GPU performance or Safari. Those broader budgets, profiling and scaling claims remain under #21. Guided in-Flight tours remain #22.
