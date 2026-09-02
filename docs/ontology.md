# Atlas Spectra ontology v0

Atlas Spectra models **frequency-bearing phenomena**, not bare frequency values. A manifest is a small, self-contained graph centered on one phenomenon.

## Core separation

- **System** — the physical, biological, technological, or abstract system under study.
- **Observable** — the property actually measured or counted.
- **Frequency profile** — how recurrence/spectral structure is represented.
- **Conditions** — context under which a value or claim applies.
- **Mechanisms** — known or proposed processes that produce behavior.
- **Detectors / measurements** — how an observable becomes data.
- **Transformations** — filtering, transduction, encoding, mixing, division, and related operations.
- **Relationships** — typed edges to other Atlas entities.
- **Claims / provenance / sources** — why a statement exists and how strong its evidence is.

A heartbeat rate and a 1 Hz sine wave can therefore occupy the same numerical neighborhood without being modeled as the same kind of thing.

## Representation vs coordinate

`frequency_profile.type` describes **what kind of representation we have**: periodic, banded, discrete-line, stochastic, event-rate, quantum transition, and so on.

`frequency_profile.axis.kind` describes **the coordinate being compared**: temporal frequency, angular frequency, spatial frequency, wavenumber, event rate, or another explicitly named axis.

Keeping these separate prevents dimensionally similar quantities from becoming semantically identical.

## Local graph model

Manifests use stable namespaced IDs and references. The first version intentionally keeps the graph local to each phenomenon so records remain readable and portable. Later ingestion can normalize these local nodes into a global graph without changing their semantics.

## External ontologies

Atlas Spectra is not RDF-first. Where established semantics help interoperability, records may carry external URIs. QUDT is the preferred source for quantity-kind and unit identifiers. SOSA/SSN concepts may be linked for sensors and observations. These mappings are annotations, not the canonical storage model.

## Evidence is data

Quantitative fields should be traceable with JSON-pointer provenance entries such as `/frequency_profile/rate`. Relationships and claims carry evidence inline. The evidence model separates basis (measurement, reference, derivation, hypothesis, subjective report, etc.) from review state.
