# Follow the signal

First shared journey slice for #25 / #22, following #24's phenomenon-first discovery. `/journeys/` presents short, manually advanced paths through **existing directed physical relationships**. The Heart activity disclosure links to cardiac sensing; primary navigation exposes all three paths.

## Paths in this slice

- Cardiac sensing: ventricular activation → arterial pulse → optical modulation → electrical PPG observation.
- Sound to nerve: A4 acoustic input → cochlear hair-cell response → auditory nerve signal.
- Quartz clock: resonance → divided one-second output.

These are deliberately short paths, not a complete physiological simulation. The cardiac-cycle reference remains in its original Heart activity group; the sensing path begins at the existing ventricular-activation record, not a newly invented edge from the summary record.

## Presentation data and build boundary

`presentation/journeys.json` is validated against `schema/journey.schema.json` by the Python regression suite. The pure TypeScript parser validates the same shape during the Astro build. Entries store only IDs, short labels, summary copy, ordered record IDs and ordered edge IDs. No frequencies, source copies, mechanism badges or invented relationships belong in this manifest.

`buildJourneys` resolves original ExplorerItems and the original edge descriptions. It rejects missing records/edges, duplicate identifiers, repeated stages, incorrect hop counts, reversed/mismatched endpoints, external endpoints, nonphysical hops, missing descriptions/evidence, and unresolved source references. Source resolution is **local to the manifest owning the edge**, which may be neither the current stage nor the upstream record. A source with the same ID in an endpoint cannot substitute for a missing owner source.

The build-time `journey-data.ts` alone imports the full corpus. React imports the pure model and type-only corpus definitions. It does not execute `import.meta.glob` on the client or import Flight's renderer. Schema, web and visual workflows trigger on presentation changes. No workflow write permissions or package dependencies are added.

## Scientific meaning

A selected stage exposes its actual system, observable, native quantity, display semantics and target-specific provenance. Its quantitative evidence is distinct from evidence for the transition into that stage. At the first stage, the connection panel previews the outgoing transition; thereafter it shows the incoming transition. The pair and direction are written explicitly.

No source quantities are averaged, copied between stages or inferred. Unknown frequency profiles remain selectable and are labeled **Frequency unspecified**. Links for an unpositioned record carry only its canonical entity ID, never the preceding stage's coordinate. Discrete spectra link to a real listed line rather than a spectral-gap midpoint; claim references retain their original identity.

Stage order and arrows represent the selected directed edges. Layout distance encodes neither frequency nor time. Repeated cardiac event-rate references are not independent measurements, and the story does not assert identical waveforms or simultaneous signals. Numerical-coincidence edges are intentionally excluded from these physical process paths; the Atlas retains them as separately typed connections.

## Navigation and access

Native buttons support pointer, keyboard and touch interaction. Stage IDs, not indexes, are persisted in `journey` and `stage` query parameters. Initial hydration, reload and browser back/forward validate both identifiers. There is no autoplay or motion effect; reduced-motion users use the same controls. A persistent polite status announces the selected stage without moving keyboard focus. Each stage links to its exact record in Atlas, Flight and the static source page. A no-JavaScript section links every ordered source record and the owner of each relationship.

The new route is not an in-Flight camera tour, a broad source-curation sign-off or the candidate relationship engine. Those remain #22, #21 and #4 follow-ups. Screen-reader DOM/focus tests are not a manual assistive-technology audit. Browser screenshots are inspection evidence, not pixel-difference goldens.
