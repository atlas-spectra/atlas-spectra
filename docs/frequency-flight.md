# Frequency Flight

Frequency Flight is an experimental alternate view of the same Atlas Spectra corpus. The 2D atlas remains the precise comparison instrument. Flight is for discovering the scale and moving between landmarks, not inferring physical connections from a beautiful scene.

Tracking: #19. First implementation: #20. The broader explorer remains #3.

## Routes and ownership

- `/atlas-spectra/explore/`: existing 2D explorer. No Flight or Three.js component import.
- `/atlas-spectra/flight/`: Astro shell + React instrument, with a lazy Three.js / React Three Fiber scene.
- `/atlas-spectra/phenomena/<id>/`: the existing complete record, sources and provenance.

All paths use Astro's `BASE_URL`. GitHub Pages remains a project site. No new hosting, cross-repository credential, CMS or dataset is needed.

`examples/*.json` → existing `corpus.ts` display adapter → `ExplorerItem[]` → pure `flight.ts` scene projection → React controls / Three.js scene.

The scene projection does not import the manifest loader at runtime. The browser gets the existing explorer records, not a second set of raw scientific manifests.

## Coordinate contract

Logical depth is `log10(display coordinate in Hz-equivalent units)`. The Three.js camera looks in negative z, so a record's world z is `-18 * logicalDepth`; moving the camera along that same rail is forward travel. The scale ruler always exposes the logarithmic coordinate.

The display coordinate inherits all existing adapter caveats: event rates are normalized for navigation, angular frequencies use their documented transform, electromagnetic wavelength/wavenumber conversions require the adapter's explicit context, and claim references are not physical spectra.

The x/y arrangement is deterministic editorial domain layout. It is not position in physical space, amplitude, energy, coherence, similarity, or causal strength. Local offsets are stable for an unchanged corpus regardless of input ordering. Adding records to a lane can change its local spacing.

### Marks

| Profile presentation | Flight geometry | Meaning |
| --- | --- | --- |
| Point | Small core and ring | A single existing display coordinate |
| Range | Narrow outlined extent with endpoint caps | Existing lower and upper coordinates |
| Discrete lines | Separate frames at individual line coordinates | Actual listed line positions, not a midpoint in their gap |
| Spectrum | Wider translucent outlined extent | Spectral coverage only, not an amplitude curve |
| Time-varying | Taller outlined extent | Frequency coverage only, not a reconstructed chirp trajectory |
| Claim reference | Hollow amber geometry and explicit label | Navigation reference, not a measurement of a physical spectrum |
| Unpositioned | No scene geometry; accessible record browser | No supported quantitative coordinate |

There is no animated oscillation, generated waveform, fabricated amplitude, random star catalog, free-fly navigation, or inferred relationship arc.

## Interaction

The theater is a bounded native vertical scroll region with a sticky scene. Its scroll range maps linearly to logarithmic coordinate. Native wheel/touch scrolling remains available; the renderer does not consume pointer gestures. At the limits, normal page scrolling can resume. The experience is finite because the seed corpus is finite.

The ruler, previous/next landmark buttons and reset are available independently of wheel input. Focusing the navigation region enables arrows (quarter-decade steps), Home and End. Form-control keys are not intercepted. Search includes unpositioned records; selecting one changes the inspector without inventing a camera location.

Labels use the same perspective-camera parameters as the renderer. They remain DOM buttons, face the reader, have leader lines to their marks, and are collision-thinned. The selected visible record has priority. Every record remains reachable through the nearby/all-record browser even when its label is culled. Sparse intervals keep the corridor, coordinate ruler, nearest records, and next-landmark control instead of presenting an unexplained blank screen.

## Deep links

`/atlas-spectra/flight/?at=2.6435&entity=<atlas-id>`

`at` is a logarithmic coordinate, not a raw Hz value. Missing/blank/malformed values use the corpus start; finite extreme values clamp to corpus bounds. Unknown IDs are ignored. Selection and coordinate restore on reload/popstate. URL updates are debounced rather than calling `replaceState` on every scroll frame.

The link back to the 2D atlas carries center and entity. The existing 2D viewport sanitizer remains authoritative there.

## Motion, failure and performance

- No autoplay or perpetual render loop. Fiber uses `frameloop="demand"` and caps pixel ratio at 1.5.
- Reduced-motion preference turns scroll flight off initially. The user can navigate in discrete steps or explicitly enable scrolling. No camera easing is added in this first slice.
- A WebGL2 availability check, React error boundary and context-loss handler preserve a usable fallback. Search, inspection and the 2D link remain available.
- Astro emits a static corpus link list as a no-JavaScript path.
- This is a seed-corpus prototype, not a benchmarked large-catalog renderer. Instancing, batching, visibility windows, memory/draw-call budgets and mobile/Safari profiling need a dedicated scale pass.

## Verification and visual evidence

`npm ci && npm run check && npm run build && npm run test:visual`

`tests/visual/flight-model.spec.ts` tests pure projection semantics without a browser fixture: deterministic input ordering, all mark kinds, missing/invalid coordinates, actual-line anchors, bounded URL values, label containment and perspective math.

`tests/visual/flight.spec.ts` exercises rendered WebGL, actual native wheel scrolling, keyboard endpoints, non-no-op reset/jump paths, selection/deep links, unpositioned inspection, reduced motion, unavailable WebGL, context loss, 2D bundle isolation and Chromium touch swipes. Software-WebGL flags live only in the Playwright configuration, not in production.

The visual tests explicitly require a rendered scene before capturing 3D evidence. A fallback page cannot silently satisfy that check. Evidence files:

- `flight-overview.png`
- `flight-detail.png`
- `flight-mobile.png`
- `flight-fallback.png`

The existing read-only screenshot job uploads these alongside the 2D screenshots. The trusted publisher on main copies successful current-head evidence to the dedicated `visual-evidence` branch. The PR body embeds links pinned to the evidence commit; the source SHA is stated separately. These are review screenshots, not pixel-difference golden-image tests.

## Follow-up direction

Evaluate the first prototype before adding more camera freedom. Subsequent work should focus on dense-label layout, large-corpus performance and cross-browser motion testing; then curated guided journeys and optional relationship overlays driven strictly by typed, sourced relationships. Do not automatically connect nearby records. Any coordinate mode beyond the current display mapping needs a separately reviewed conversion contract.

## Framework references

- React Three Fiber installation and React-major compatibility: https://r3f.docs.pmnd.rs/getting-started/installation
- Canvas, demand rendering and fallback API: https://r3f.docs.pmnd.rs/api/canvas
- Astro client-island isolation: https://docs.astro.build/en/concepts/islands/
