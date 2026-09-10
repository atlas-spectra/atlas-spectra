# Atlas Spectra

**Understand frequency across scales.**

Atlas Spectra is an open, interactive atlas of oscillations, spectra, rhythms, rates, and resonances across nature and technology.

The project combines a rigorous schema-driven dataset with a zoomable explorer and an evidence-aware relationship graph. Frequency is the entry point, not the schema: systems, observables, conditions, measurements, transformations, relationships, and provenance are separate reusable layers.

## Foundation

The data foundation is now implemented and pressure-tested by the seed corpus:

- [Ontology and v0 schema](https://github.com/atlas-spectra/atlas-spectra/issues/1) — canonical representation of frequency-bearing phenomena
- [Provenance and evidence](https://github.com/atlas-spectra/atlas-spectra/issues/5) — per-claim sources, uncertainty, derivation, and review semantics
- [Seed corpus](https://github.com/atlas-spectra/atlas-spectra/issues/2) — cross-domain reference manifests that pressure-test the model

The product north star and phased roadmap live in [GitHub issue #7](https://github.com/atlas-spectra/atlas-spectra/issues/7).

## Web experiences

The site uses Astro, TypeScript, and React islands. The checked-in `examples/*.json` manifests remain the source of truth; the web layer derives its view model at build time.

**Atlas** (`/atlas-spectra/explore/`) is the precise Canvas 2D comparison instrument: a logarithmic grid, domain lanes, floating labels, pan/zoom, and evidence-aware inspection.

**Frequency Flight** (`/atlas-spectra/flight/`) is an experimental alternate perspective. Scroll or swipe through logarithmic frequency depth in a Three.js / React Three Fiber corridor, use the ruler or landmark buttons to jump, and inspect the same records and sources. Its 3D code loads only on the Flight route. Reduced-motion preferences, keyboard controls, unpositioned records, and a usable no-WebGL fallback are part of the first slice. It is a seed-corpus prototype, not a benchmarked large-catalog renderer.

Depth is a display coordinate; lateral placement is editorial domain layout. Neither view treats proximity as evidence of causation. Ranges, spectrum extents, and claim references retain their original semantics.

Requirements:

- Node.js 22.12 or newer (see `.nvmrc` for the CI version)
- npm

Run locally:

```bash
npm ci
npm run check
npm run dev
```

Create a production build with:

```bash
npm run build
```

Run browser regressions and generate visual-review screenshots:

```bash
npx playwright install --with-deps chromium
npm run build
npm run test:visual
```

Screenshots are written to `artifacts/screenshots/`. CI publishes passing, current-head evidence to the dedicated `visual-evidence` branch for embedding in PRs. These are behavior tests and review screenshots, not pixel-difference golden-image tests.

The 2D interaction/rendering contract is documented in [docs/explorer-architecture.md](docs/explorer-architecture.md); the 3D coordinate, accessibility, and rendering contract is in [docs/frequency-flight.md](docs/frequency-flight.md). Explorer implementation remains tracked in [issue #3](https://github.com/atlas-spectra/atlas-spectra/issues/3), with Flight in [#19](https://github.com/atlas-spectra/atlas-spectra/issues/19), performance/label refinements in [#21](https://github.com/atlas-spectra/atlas-spectra/issues/21), and curated journeys in [#22](https://github.com/atlas-spectra/atlas-spectra/issues/22).

The product deploys through GitHub Pages at <https://atlas-spectra.github.io/atlas-spectra/>. The organization root <https://atlas-spectra.github.io/> is a tiny redirect managed by the separate `atlas-spectra.github.io` Pages repository. See [docs/github-pages.md](docs/github-pages.md).

## Principles

- **Graph-first, not catalog-first.** A frequency value without its system, observable, conditions, measurement, and provenance is incomplete.
- **Spectrum-aware.** Phenomena may be scalar frequencies, bands, line spectra, stochastic processes, time-varying signals, event rates, or transitions.
- **Evidence-aware.** Physical mechanisms, mathematical analogies, statistical correlations, subjective associations, and numerical coincidences remain distinguishable.
- **Explainable discovery.** Machine-suggested connections must say why they were proposed and what evidence supports them.
- **Open and schema-driven.** The ontology, manifests, provenance model, import tooling, and derived relationships are durable product assets.
- **Interactive by default.** Orders of magnitude should be explorable as an experience, not only as a table.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for commit and pull request conventions.

## License and source data

Repository-authored code and documentation are licensed under the [Apache License 2.0](LICENSE) unless otherwise noted.

Imported scientific datasets, source material, quotations, images, and other third-party content retain their original rights and licensing status. Atlas Spectra records should preserve source provenance and applicable licensing metadata rather than implying that inclusion relicenses upstream material.
