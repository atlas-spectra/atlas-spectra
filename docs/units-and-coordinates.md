# Quantities, units, and coordinates

## Canonical rule

Store the value in the unit used by the authoritative source when that preserves meaning. Include a QUDT unit URI when one is known and appropriate. Normalized SI values can be derived later; source fidelity should not be destroyed during ingestion.

## Frequency is not one semantic quantity

Atlas Spectra distinguishes at least:

- temporal frequency (`Hz`, `s^-1`)
- angular frequency (`rad/s`)
- spatial frequency (`cycles/m`, `cycles/degree`, etc.)
- wavenumber (`m^-1`, `cm^-1`)
- event rate (`events/s`, `bpm`, failures/hour, etc.)

Some share the same physical dimension while differing in meaning. Algorithms must compare `axis.kind` and quantity-kind semantics before treating values as directly comparable.

## Ranges and uncertainty

A range is not an uncertainty interval. `quantityRange` represents a stated interval or band. `uncertainty` belongs to an individual measured/derived quantity. Future versions may add distribution objects once real datasets require them.

## Conversion

Unit conversion may change representation without creating a scientific relationship. Transformations such as frequency division, mixing, or physical transduction are graph relationships and must not be conflated with unit normalization.
