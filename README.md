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

## Web explorer

The first interactive prototype is built with Astro, TypeScript, a React island, and Canvas 2D. The checked-in `examples/*.json` manifests remain the source of truth; the web layer derives its view model at build time.

Requirements:

- Node.js 22.12 or newer
- npm

Run locally:

```bash
npm install
npm run check
npm run dev
```

Create a production build with:

```bash
npm run build
```

The interaction/rendering contract is documented in [docs/explorer-architecture.md](docs/explorer-architecture.md). Explorer implementation is tracked in [issue #3](https://github.com/atlas-spectra/atlas-spectra/issues/3).

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
