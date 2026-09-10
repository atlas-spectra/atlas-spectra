# Interactive 2D neighborhoods

This extends the workspace in PR #24 after product feedback: labels and a cleaner grid alone did not give enough surrounding context. The precise axis stays authoritative, but is now an instrument for inspecting a neighborhood, not only a catalog.

## Read the surroundings

- A named landmark trail uses existing corpus IDs. Coordinates and descriptions come from those records. The trail is an ordered set of navigation shortcuts, not a new set of scientific bands or relationships.
- Move over the chart to move a frequency lens without moving the camera. Its vertical guide and nearby-record emphasis update with the pointer. Hover/focus on a record uses that record's actual plotted anchor.
- A native slider offers the same inspection without hover; it supports keyboard and touch. Pinning the lens stops pointer following. Camera navigation clears the old lens so it cannot drift outside the visible view.
- The neighborhood panel ranks the whole corpus, not just the active domain filter. Outside-filter and off-screen neighbors are marked explicitly; clicking one navigates to it and clears the filter deliberately.
- Distance uses the nearest actual discrete line, the closest endpoint of an extent, or zero for a coordinate inside an extent. It never substitutes an imaginary line in a spectral gap. Unknown/invalid coordinates are omitted, not invented.
- Ratio labels refer to *display coordinates*, not measured similarity or a common mechanism. Claim references and event-rate semantics remain unchanged.
- The reciprocal ruler says **If periodic**. Its `1/f` calculation is a mathematical aid, never a claim that a selected event process, percept, or spectrum has that measured period.

## Navigation and motion

Explore here, named landmarks, and lower/higher landmarks make short, 320 ms user-triggered camera transitions. There is no idle animation, oscillation, autoplay, or fake live-data feed. Keyboard/pointer/wheel/fit navigation cancels a transition before taking control. Reduced motion skips travel; preference changes, document hiding, and unmounting cancel outstanding frames. Final camera states retain full numeric precision in the existing URL contract; cursor hover does not continuously rewrite URLs.

## Recorded connections

Trace recorded connections draws only existing `ExplorerRelationship` edges when both records are positioned in the current window. Arcs connect **records**, not measured coordinate pairs: an edge can concern an endpoint, condition, or transformation described in its evidence. Arcs inherit stored direction/type/category. Physical-category arcs are solid; other categories are dashed. A category is not an evidence-strength badge. The inspector retains mechanism status and provenance; missing/unpositioned peers are counted instead of being assigned geometry. Frame connections fits the available positioned records.

The heartbeat/quartz example remains a numerical coincidence, with `mechanism: none`. No new relationships are inferred from matching or nearby numbers.

## Review evidence

Existing regressions are retained. New pure tests cover interval/line distances, unresolved values, reference/event semantics, corpus-driven landmarks, and the reciprocal ruler. Browser tests exercise pointer-following, pinning, keyboard inspection, context outside filters, exact completed travel, reduced motion, cancellation, typed edges, and narrow layout.

CI also records a real `atlas-interaction.webm` alongside PNGs in the existing read-only `explorer-screenshots` artifact. The trusted publisher still copies only PNGs. The video can be downloaded for interaction review; it is not a generated mockup. No new dependencies or workflow permissions are introduced.

## Platform references

- Reduced motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Frame scheduling: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- Video recording: https://playwright.dev/docs/videos
