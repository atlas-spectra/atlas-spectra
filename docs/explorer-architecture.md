# Explorer architecture

The first Atlas Spectra explorer is deliberately built directly on the checked-in seed corpus.

## Stack

- **Astro** owns routing, static generation, metadata, and phenomenon detail pages.
- **React** is used only for the interactive explorer island.
- **Canvas 2D** renders the logarithmic lanes and marks.
- **DOM** remains responsible for controls, detail content, links, and accessible alternatives.
- `examples/*.json` remains the scientific source of truth. `src/lib/corpus.ts` is a build-time view adapter, not a second dataset.

## Display coordinate

The explorer's horizontal axis is a navigation coordinate expressed as equivalent cycles per second. It must not be interpreted as a universal physical ontology.

Native temporal-frequency quantities map directly. Event rates are normalized to events per second without being reclassified as oscillators. Wavelength and wavenumber may be mapped to equivalent vacuum electromagnetic frequency using explicit physical transforms. Frequency-like claim references can be positioned as references, with a distinct mark style.

Spatial frequency and other coordinates remain unpositioned unless a scientifically justified transformation is available.

Every transformed or reference position carries a human-readable mapping note shown in the detail panel and record page.

## Rendering model

The Canvas renderer uses:

1. a log10 view window (`center`, `span`) measured in decades;
2. fixed semantic lanes;
3. different mark grammars for points, bands, discrete lines, spectra, chirps, and claim references;
4. hit regions generated during the same draw pass;
5. labels only at closer zoom levels or for the selected item.

This keeps the draw loop proportional to visible marks and avoids a DOM node per plotted primitive.

## URL state

Explorer state is deep-linkable through query parameters:

- `center`: log10 center of the visible display coordinate;
- `span`: visible width in decades;
- `entity`: selected Atlas phenomenon ID.

Example:

```text
/explore/?center=2.643&span=5.000&entity=acoustics.standard-pitch.a4
```

Canonical static record pages use:

```text
/phenomena/<atlas-id>/
```

## Performance baseline

The seed corpus is intentionally tiny, so raw frame timing is not meaningful yet. The architecture baseline for the next catalog scale is:

- one Canvas surface for marks and grid;
- one draw pass over filtered/visible explorer items;
- no React component per mark;
- no DOM label per mark;
- memoized corpus and lane indexes;
- progressive label disclosure by zoom.

Before catalog ingestion in #6, add a synthetic benchmark at 10k and 100k marks and use spatial bucketing or level-of-detail aggregation if full scans become a bottleneck.

## Prototype boundaries

This first vertical slice does not attempt to close #3. Still needed:

- richer waveform/spectrum mini-views;
- relationship overlay/filter controls;
- explicit axis/transform controls;
- denser progressive-disclosure rules;
- touch interaction refinement;
- synthetic large-catalog benchmark;
- visual design iteration with real browser screenshots.
