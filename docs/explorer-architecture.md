# Logarithmic explorer architecture

Issue #3 defines the primary interactive Atlas Spectra experience: a zoomable logarithmic explorer backed directly by the scientific corpus.

## Stack

- **Astro** owns routes, layouts, static phenomenon pages, SEO, and build-time corpus loading.
- **React + TypeScript** owns the hydrated explorer island and interaction state.
- **Canvas 2D** renders the scientific marks and scales to large mark counts without creating one DOM node per plotted object.
- **DOM overlays** render a collision-thinned set of readable labels, hover/focus tooltips, controls, detail content, provenance, sources, and relationship metadata.

The site deploys as a GitHub Pages project site at `https://atlas-spectra.github.io/atlas-spectra/`; application links are base-path aware.

## Corpus contract

`examples/*.json` remains the only scientific source of truth. The web build derives a compact `ExplorerItem` view model directly from those manifests. No web-specific database, CMS, or duplicate scientific schema is introduced.

The adapter preserves the manifest's native profile and axis while separately computing an optional display coordinate for navigation. Complete raw manifests stay on the Astro/build side; the hydrated React island receives only the compact explorer fields it actually renders.

## Display coordinate is not ontology

The x-axis is an **equivalent cycles/second display coordinate**, not a claim that all plotted quantities are physically identical.

- temporal frequency in Hz is native;
- event rate is normalized to events/s while remaining an event process;
- angular frequency is divided by `2π` when the unit is supported;
- wavelength is transformed with `f = c / λ` only when the manifest has explicit electromagnetic-domain context;
- wavenumber is transformed with `f = c·k` after unit normalization only when the manifest has explicit electromagnetic-domain context;
- non-electromagnetic wavelength or wavenumber records remain unpositioned until a medium-specific transform is available;
- selected frequency-like perceptual claim references may be shown as dashed scalar reference marks or dashed ranged-reference bands;
- unsupported or unresolved coordinates remain unpositioned.

Every transformed mark retains a human-readable explanation of the mapping for the detail panel.

## Marks and labels

The renderer distinguishes:

- scalar point;
- range or band;
- discrete spectral lines;
- continuous spectrum / response range;
- time-varying/chirp range;
- scalar frequency-like reference mark;
- ranged frequency-like reference band.

The same mark vocabulary is repeated in a compact legend and in the DOM label glyphs. Labels are intentionally not one-per-mark at all zoom levels: Atlas groups candidates by lane and keeps enough horizontal separation to remain legible. Hovered and selected phenomena are always promoted even when ordinary labels are collision-thinned. Hovering either the Canvas mark or its DOM label exposes the phenomenon name, lane, and display coordinate without requiring selection.

Visual proximity alone must never be rendered as evidence of causal relation.

## Viewport contract

The camera is bounded by the actual positionable corpus rather than an arbitrary global logarithmic range.

1. Derive the minimum and maximum `log10` display coordinate from all positionable records.
2. Add a small fixed visual padding around that corpus extent.
3. Clamp the visible span to the padded corpus span.
4. Clamp the center relative to the current half-span so the viewport remains inside the padded corpus extent.

Drag, wheel zoom, keyboard navigation, deep-linked URL state, and search-driven recentering all pass through the same sanitizer. Therefore a user cannot pan or zoom the entire corpus out of view. **Fit all** (and the `Home` key while the Canvas is focused) returns to the complete padded extent deterministically.

## Interaction

The interaction model supports:

- wheel zoom anchored at the pointer;
- drag pan;
- keyboard pan/zoom plus `Home` for Fit all;
- visible search across positioned and unpositioned records;
- hover/focus identification through floating labels and tooltips;
- mark or label selection;
- collision-thinned labels at every zoom level;
- deep-linked `center`, `span`, and selected `entity` query state.

A selected mark opens a DOM detail panel containing its native axis, native representation, display transform, provenance summary, and typed relationships. Static full records live under `/phenomena/<id>/` relative to the configured Astro base. Records that cannot be placed on the shared axis remain reachable through the visible search UI rather than through hidden focusable controls.

## Visual evidence

Explorer-facing pull requests use a Chromium Playwright gate that exercises bounded navigation and produces deterministic screenshots for visual review:

- desktop overview;
- hover / floating-label state;
- Fit-all state;
- mobile layout.

Screenshot artifacts are kept out of the product branch. A trusted `workflow_run` publisher can copy only the generated PNG evidence to the dedicated `visual-evidence` branch and maintain an embedded review comment on the originating PR. This mirrors the separation between product source and review evidence used by Atlas Mechanica.

## Performance baseline

Canvas remains authoritative for the scientific marks. The DOM overlay contains only the collision-thinned visible labels rather than one element for every plotted object, preserving the large-catalog direction while making the current corpus immediately legible.

The seed corpus is intentionally too small to establish a meaningful upper bound, so #3 still requires a synthetic large-catalog benchmark before closure.

Target for the next benchmark pass:

- 10,000 plotted marks;
- interactive pan/zoom near 60 fps on a contemporary laptop;
- no DOM-per-mark rendering architecture;
- bounded label-overlay count under broad views;
- hit testing optimized or indexed if the linear scan becomes material.

## Follow-up work for #3

- relationship overlay and relationship/evidence filters;
- richer waveform/spectrum mini-views in detail;
- more advanced collision-aware label placement if the corpus density requires it;
- touch/pinch interaction refinement;
- synthetic 10k+ performance benchmark;
- screenshot-driven visual iteration;
- transformed-axis filtering.
