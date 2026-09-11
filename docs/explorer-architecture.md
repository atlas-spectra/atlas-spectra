# Logarithmic explorer architecture

Issue #3 defines the primary interactive Atlas Spectra experience: a zoomable logarithmic explorer backed directly by the scientific corpus. The current 2D interaction/layout contract is [atlas-workspace.md](atlas-workspace.md), implemented in #24 and tracked by #23. The alternate immersive mode is [Frequency Flight](frequency-flight.md).

## Stack

- **Astro** owns routes, layouts, static phenomenon pages, SEO, and build-time corpus loading.
- **React + TypeScript** owns the hydrated explorer island and interaction state.
- **Canvas 2D** renders scientific marks and axis ticks.
- **DOM overlays** render identifying labels, domain headings, tooltips, controls and evidence-aware inspection.
- **A small SVG overview** shows the whole corpus and the current viewport, with a native range input for accessible recentering.

The 2D route does not import the Flight scene or Three.js. The site remains a GitHub Pages project site at `https://atlas-spectra.github.io/atlas-spectra/`; links use Astro's base path.

## Corpus contract

`examples/*.json` remains the only scientific source of truth. `corpus.ts` derives the compact `ExplorerItem` model at build time. No web database, CMS, duplicate scientific schema, or raw-manifest client payload is introduced. `atlas-view.ts` provides pure layout, bounds, filtering and navigation functions; it does not perform scientific unit conversions.

## Display coordinate is not ontology

The x-axis is a **Hz-equivalent display coordinate**, not a claim that all plotted quantities are physically identical.

- Temporal frequency in Hz is native.
- Event rate is normalized to events/s while remaining an event process.
- Angular frequency is divided by `2π` when the unit is supported.
- Electromagnetic wavelength uses `f = c / λ`; electromagnetic spectroscopic wavenumber uses `f = c·k` after unit normalization. Both require explicit electromagnetic-domain context.
- Non-electromagnetic wavelength/wavenumber remains unpositioned until a medium-specific transform is available.
- Frequency-like perceptual claim references retain dashed scalar or ranged-reference presentations. Their exact positioning claim, target and evidence accompany the derived display value.
- Unsupported or unresolved coordinates remain unpositioned and inspectable.

Original values and transformation explanations remain visible. Reference coordinate evidence is separate from record provenance, with source links resolved per evidence entry, not inferred from unrelated fields.

## Marks and labels

Points, bands, discrete spectral lines, spectrum extents, time-varying extents, and scalar/ranged references remain distinct. A time-varying extent is not drawn as a reconstructed frequency/time trajectory. Discrete-line labels point to real visible lines and their hit targets do not fill the gaps.

The seed workspace deliberately allocates a DOM label for each visible positioned record. Greedy interval packing uses additional rows when labels or mark extents overlap. Empty corpus lanes are omitted; domain focus provides a compact local view. Domain accents and row positions are categorical layout, not physical quantities, similarity or evidence strength.

This replaces the earlier collision-thinned label policy for the small seed corpus. It trades additional vertical space for immediate identification of coincident records. It is **not** a 10,000-record performance claim. Windowing, instancing/indexing, bounded label density and a measured large-catalog policy remain future work under #3.

## Viewport and interaction

Bounds derive from finite positive display coordinates, with visual padding. All camera paths share a center/span sanitizer. Fit all returns to the entire corpus; Fit results frames the active domain/search; Fit selection frames the selected record. Unpositioned-only sets cannot produce a camera target.

The padded bounding interval can contain genuine empty gaps. Bounds do not imply that every viewport contains a record. Those gaps show an explicit recovery message while the overview and record browser remain usable.

Wheel zoom is pointer-anchored; horizontal trackpad input and primary-pointer drags pan. Arrow/plus/minus/Home keys and ordinary buttons provide alternatives. Native vertical touch scrolling and browser pinch/Ctrl-wheel magnification remain available. `center`, `span`, `entity` and `lane` restore from the URL; full numeric precision is retained and writes are debounced. Plot selection does not move the viewport; search/catalog navigation intentionally frames its result.

## Visual evidence

The read-only Chromium Playwright workflow runs existing 2D and Flight regressions plus workspace tests, then uploads overview, hover, fit-all, domain-focus, evidence-detail and mobile screenshots. A trusted current-head `workflow_run` publisher copies generated PNGs to the separate `visual-evidence` branch without executing PR code. PR descriptions embed immutable evidence-commit URLs with the tested source SHA. Actions does not automatically maintain PR comments in this repository.

These are browser behavior checks and review captures, not pixel-difference golden tests. Inspect the actual artifacts before visual sign-off.

## Remaining work for #3

Relationship overlays and evidence filters; sourced waveform/spectrum mini-views; measured large-catalog performance and label-density policy; further touch/cross-browser testing; and transformed-axis filtering. Do not close #3 on the basis of seed-corpus rendering alone.
