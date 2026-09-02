# Logarithmic explorer architecture

Issue #3 defines the primary interactive Atlas Spectra experience: a zoomable logarithmic explorer backed directly by the scientific corpus.

## Stack

- **Astro** owns routes, layouts, static phenomenon pages, SEO, and build-time corpus loading.
- **React + TypeScript** owns the hydrated explorer island and interaction state.
- **Canvas 2D** renders the frequency plot and scales to large mark counts without creating one DOM node per plotted object.
- **DOM** remains responsible for controls, accessible detail content, provenance, sources, and relationship metadata.

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

## Marks

The first renderer distinguishes:

- scalar point;
- range or band;
- discrete spectral lines;
- continuous spectrum / response range;
- time-varying/chirp range;
- scalar frequency-like reference mark;
- ranged frequency-like reference band.

Visual proximity alone must never be rendered as evidence of causal relation.

## Interaction

The initial interaction model supports:

- wheel zoom anchored at the pointer;
- drag pan;
- keyboard pan/zoom;
- visible search across positioned and unpositioned records;
- mark selection;
- progressive labels as the visible span narrows;
- deep-linked `center`, `span`, and selected `entity` query state.

A selected mark opens a DOM detail panel containing its native axis, native representation, display transform, provenance summary, and typed relationships. Static full records live under `/phenomena/<id>/` relative to the configured Astro base. Records that cannot be placed on the shared axis remain reachable through the visible search UI rather than through hidden focusable controls.

## Performance baseline

The Canvas renderer performs one paint pass for the visible marks and keeps DOM complexity roughly constant with catalog size. The seed corpus is intentionally too small to establish a meaningful upper bound, so #3 still requires a synthetic large-catalog benchmark before closure.

Target for the next benchmark pass:

- 10,000 plotted marks;
- interactive pan/zoom near 60 fps on a contemporary laptop;
- no DOM-per-mark architecture;
- hit testing optimized or indexed if the linear scan becomes material.

## Follow-up work for #3

- relationship overlay and relationship/evidence filters;
- richer waveform/spectrum mini-views in detail;
- collision-aware progressive labels;
- touch/pinch interaction refinement;
- synthetic 10k+ performance benchmark;
- screenshot-driven visual iteration;
- explicit transformed-axis legend and filtering.
