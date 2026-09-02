# Relationship vocabulary

Relationships are typed so numerical proximity cannot masquerade as mechanism.

## Physical

`GENERATES`, `EMITS`, `CONTAINS_MODE`, `DETECTED_BY`, `TRANSDUCES_TO`, `FILTERED_BY`, `COUPLES_TO`, `RESONATES_WITH`, `ENTRAINS`, `PHASE_LOCKS_WITH`, `MODULATES`, `MIXES_WITH`, `DIVIDED_TO`, `MULTIPLIED_TO`.

## Mathematical / spectral

`HARMONIC_OF`, `SUBHARMONIC_OF`, `SHARES_SPECTRAL_BAND_WITH`, `SHARES_DYNAMICAL_MODEL_WITH`.

## Statistical

`COHERENT_WITH`, `CORRELATED_WITH`.

## Weak numerical

`SAME_NUMERICAL_FREQUENCY_AS` is deliberately weak. It records a searchable coincidence, not causality.

## Epistemic / subjective

`HYPOTHESIZED_RELATION`, `SUBJECTIVELY_ASSOCIATED_WITH`, `DISPUTED_RELATION`, `REFUTED_RELATION`.

Every relationship also has a category and an evidence object. The evidence object records basis, review status, mechanism status, supporting sources, and optional derivation/confidence.

## Local and cross-manifest endpoints

Relationship endpoints are local by default. A reference such as:

```json
{"id": "observable.cesium-133.transition-frequency"}
```

must resolve to a node declared in the same manifest.

A relationship may intentionally point to a node owned by another Atlas Spectra manifest by using an explicit Atlas-scoped reference:

```json
{
  "id": "biology.heart.resting-adult-rate",
  "scope": "atlas"
}
```

Atlas-scoped references are not treated as locally resolved; corpus/global-graph validation is responsible for verifying that the referenced Atlas ID exists. Each relationship stored in a phenomenon manifest must still have at least one local endpoint, so a manifest cannot become a container for unrelated external-to-external edges.

This scoped form is currently limited to relationship endpoints. Measurements, detectors, transformations, conditions, provenance, and claims retain strict local-reference semantics in v0.
