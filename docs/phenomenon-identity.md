# Recognize the subject before reading the frequency

PR #24 adds an editorial identity layer to the 2D atlas. A repeated band glyph explains representation, but cannot distinguish a heartbeat count from a pressure pulse or ventricular electrical activation. The visual hierarchy is now subject pictogram, short name, observed quantity, and value. The actual scientific mark remains on the logarithmic coordinate below the label.

## Ownership

`src/lib/phenomenon-identity.ts` is a typed registry keyed by canonical record ID. It contains only short titles, distinguishing subtitles, symbol names and search aliases. It is not a new scientific manifest: there are no coordinates, values, evidence statuses or relationships in it. Current seed records have curated identities; unknown records retain their canonical names and a neutral document symbol. Search still includes original IDs/names/domains in addition to visible aliases.

`PhenomenonFace` is shared by plot labels, search, the record browser and neighborhood cards. The same symbol is reused in the landmark strip and inspector. Pictograms are decorative SVGs paired with visible text, not the only source of meaning. The canonical name remains visible in the inspector and on the full record. IDs and links are unchanged.

## The cardiac comparison

- **Heartbeat** / **Beats counted**: a heart pictogram.
- **Arterial pulse** / **Pressure pulses arriving**: a vessel pictogram.
- **Heart electricity** / **Ventricular activations**: electrodes and a lightning pictogram, not a fabricated ECG trace.

These distinguish the observable described in each canonical record's `observable` and `summary`. Their shared 60–100 bpm population reference range does not make them the same signal or a simultaneous measurement. Native event-rate labels come from `display.nativeLabel`; no value is duplicated in the identity registry. Normalized coordinates and event-rate semantics remain unchanged. A short contextual note appears only when at least two explicitly identified cardiac observations are visible, and only asserts shared ranges when their actual display extents agree.

The icons also separate A4 sound from A4 as heard (tuning fork versus ear), and a quartz crystal from its divided watch-tick output. Claim references keep their explicit Reference badge, dashed treatment, and separately targeted evidence.

## Rendering and layout

The pictograms are subject identifiers, not anatomical diagrams, measured waveforms, spectra, amplitude or physical spatial scale. Accent colors are decorative; lane colors still denote domains. No animated signal, common phase, timing sequence or causal arrow is inferred from identity.

Label dimensions are budgeted by `ATLAS_LABEL_HEIGHT` and `ATLAS_ROW_HEIGHT` in the pure layout. Additional vertical space is used without changing any x-coordinate or hiding coincident seed records. The main label's height and leader endpoint use that same height constant. DOM tests check real bounds and visibility at desktop and narrow mobile widths; pure tests retain actual spectral-line hit semantics.

## Review evidence

`tests/visual/atlas-identity.spec.ts` checks registry IDs against the source corpus, neutral fallback, alias search, unchanged coordinates and event semantics, distinct SVG subjects, native units, selection/keyboard behavior, unclipped cardiac subtitles, and A4 reference evidence. It captures the three cardiac labels **without hovering or selecting**, plus mobile and sound-versus-perception views.

All earlier interaction, scientific, Flight and 2D tests remain required. Screenshots are visual-review evidence, not proof that every person recognizes every icon; recognition and large-catalog density still need user feedback.
