# Trace a guided connection

Focused #31 / #22 slice after merged #30. The whole-atlas overview gains an optional **Trace this connection** disclosure for the active validated journey hop. Free Flight does not show it, and entering a guide starts with it collapsed. No extra scene labels, global graph arcs, autoplay or new dependencies.

## Presentation and meaning

Two explicitly labeled rows compare **A (source)** and **B (target)** using the exact same full-corpus logarithmic projection as the overview. Vertical separation is editorial. It is not another physical quantity, elapsed time, signal propagation, amplitude or physical distance. The A → B heading describes the stored edge direction, not an increasing-frequency arrow.

Points are ticks, ranges are original low/high extents, and line spectra retain every actual line. No spectral gap is filled and no navigation midpoint is shown as a measurement. Source and target are distinguished with letters, words, separate rows and solid/dashed styles, not color alone. Claim references and event rates keep their visible qualifiers and native/derived quantities.

The local classifier distinguishes lower/higher extents, overlapping positions, identical non-line extents, disjoint positions inside spectral envelopes, and unpositioned endpoints. It does not infer any edge, mechanism or equality of signals. Matching cardiac reference ranges remain distinct observations. Unknown frequencies receive no mark and no borrowed coordinate; both endpoints remain inspectable.

The view takes original `ExplorerItem` and `FlightRecord` objects plus the current `JourneyHop`. It does not mutate them or copy one record's quantities or evidence onto another. The hop was already validated by the shared build-time journey builder, including owner-local source resolution. The trace also fails closed on unknown stages, mismatched direction, absent source records, nonphysical/unsourced hops, and invalid scale bounds. Invalid endpoint geometry is left unpositioned.

## Interaction and state

The trace is a native details disclosure. Opening or closing it changes no camera, stage or selection state. While open, it follows the current connection as the existing stage controls advance. First stage previews its outgoing edge; later stages show their incoming edge, matching the inspector.

Inspect source/target uses canonical journey stage navigation; unknown stages still do not move the camera. An evidence link targets the exact current connection section in the existing inspector. Quantity evidence and owner-resolved relationship evidence remain separate.

The disclosure is keyed by journey, unmounted on exit and recreated closed for a different or newly entered journey. Reload retains the existing exact journey/stage/camera state but starts the optional disclosure closed. Changing a stage within a journey does not replace the native controls or move focus. The original full-corpus ruler remains the only camera slider. No state is stored in the scientific corpus.

## Validation

Model tests cover original object/evidence preservation, falling and rising frequency order, equal and overlapping extents, real line gaps, reference/event qualifiers, missing frequencies, invalid endpoints and scale projection.

Browser tests cover opt-in behavior, stable camera/canvas and scene budgets, full-scale alignment between overview and trace marks, canonical endpoint selection, edge updates, history/reload/exit, focus, source-evidence targeting, reduced motion, WebGL-unavailable use and native mobile taps at 390/320px. Screenshots capture the quartz pair, overlapping cardiac ranges, unknown endpoint, relationship evidence and mobile overview. Existing regression cases remain enabled; screenshots are visual inspection evidence, not pixel-difference goldens.

This does not implement arbitrary graph comparison, general candidate discovery, narrated/animated tours, full-scene performance budgets, Safari certification or a manual assistive-technology audit.
