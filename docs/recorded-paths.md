# Recorded path finder

The optional **Find a recorded path** panel lives inside Connections. It extends one-link browsing, not the Flight corridor or the scientific corpus.

## Meaning

A result is one shortest route by link count through stored record-level edges. It is not a new scientific relationship, a combined evidence score, a curated signal journey or proof of end-to-end causation. Physical-category links can still have proposed mechanisms or different conditions. Every step retains its original edge object, owner-local sources and review status; inspect it in the existing pair workspace.

The defaults are **Physical links only** and **Follow stored direction**. **All recorded categories** and **Allow either direction** are explicit choices, never fallback behaviors. Reverse traversal is browsing against the stored source/target direction, not reversal of a physical process. A nonphysical step prevents interpreting the route as a physical signal journey. Numerical equality, coordinates and membership of presentation groups never create an edge. Unknown-frequency observations can participate in a path without acquiring a coordinate.

## Algorithm and limits

`findRecordedPath` uses breadth-first search with a visited set, queue cursor and predecessor map. Sorting by stable edge ID makes equal-length alternatives deterministic, independent of input order. It returns one route, not all shortest routes and not the strongest evidence. Parallel edges remain distinct in the input; one can be selected by the deterministic tie break. Self-links/cycles cannot make an infinite search. Identical endpoints are a zero-link selection, not inferred self-coupling.

The interactive boundary is 10,000 observation IDs, 50,000 record-level edges, 20,000 examined adjacency entries and six links per path. Catalog limits are checked before sorting. Search-work or hop exhaustion is explicitly distinguished from an exhausted reachable component; neither is proof that observations are physically unrelated. These are safety bounds, not a measured performance guarantee. Non-root node edges remain out of scope and counted in the panel.

The existing build-time catalog remains the schema/type/source-validation boundary. The path helper additionally rejects dangling observation endpoints, duplicate or blank edge IDs and invalid categories. It neither borrows absent evidence nor filters out an inconvenient edge based on missing frequencies.

## State and interaction

The panel owns only `path=recorded`, `path_from`, `path_to`, `path_direction` and `path_kinds`. Original `entity`, `edge`, `kind`, `q`, unrelated parameters and history state belong to their existing owners. Invalid endpoint IDs remain unselected; unknown options fall back to restrictive defaults. Opening starts from the current browsing observation but subsequent link inspection does not change the path endpoints.

Native selectors update the path. Ordinary **Inspect link & evidence** activation updates and focuses the existing pair inspector without reloading. Modified-click links retain a complete URL and stable detail anchor. Back/forward restores both independent views. Closing removes only path parameters, retains the selected direct link, and focuses the open trigger. Repeated current settings are no-ops. No initial autofocus or automatic motion is introduced; focus moves only on explicit open, close or inspect actions.

The original no-JavaScript relationship list remains available; interactive search itself requires JavaScript. No new dependencies, 3D imports, schema changes or workflow permissions are required.

## Validation

Pure tests cover shortest routes, stable ties, parallel/self edges and cycles, unknown quantities, missing graph paths, type filtering, reverse browsing, graph/work/hop limits, invalid endpoints/graphs, node-level exclusion and composed URL state. Browser tests cover real corpus paths, nonphysical and reverse warnings, individual evidence, independent endpoints, keyboard/touch focus, history/reload, malformed links, and narrow layouts. CI captures actual desktop/mobile views; they are not scientific review or pixel-golden comparisons.
