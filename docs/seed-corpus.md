# Seed corpus

The seed corpus is intentionally small and heterogeneous. Its job is to pressure-test the ontology before Atlas Spectra attempts broad catalog coverage.

## Current reference manifests

| Manifest | Representation | Coordinate |
| --- | --- | --- |
| Typical adult resting heart rate | event rate | event rate |
| Cesium-133 hyperfine transition | quantum transition | temporal frequency |
| Quartz wristwatch resonance | periodic | temporal frequency |
| Quartz wristwatch one-second tick | periodic | temporal frequency |
| Standard tuning pitch A4 | periodic | temporal frequency |
| Carbon dioxide bending mode | discrete line | wavenumber |
| CIE 2006 LMS cone fundamentals, 2° | continuous response curve | wavelength |
| Incident optical stimulus at a cone photoreceptor | unresolved optical spectrum | wavelength |
| Cone photoreceptor electrical response | unresolved downstream signal | temporal frequency |
| Cone synaptic glutamate output | unresolved downstream signal | temporal frequency |
| Cochlear hair-cell electrical response | unresolved downstream signal | temporal frequency |
| Auditory nerve electrical signal | unresolved downstream signal | temporal frequency |
| Resting adult ventricular electrical activation | event rate | event rate |
| Resting adult arterial pulse events | event rate | event rate |
| Resting adult PPG pulse observations | event rate | event rate |

## Schema pressure discovered

### Wavelength is a native spectral coordinate

Authoritative color-science datasets are naturally tabulated in wavelength. The CIE 2006 LMS cone fundamentals CSV is published from 390 nm to 830 nm in 1 nm increments (441 samples). v0 therefore permits a wavelength axis for continuous spectra rather than requiring an eager conversion to temporal frequency.

### A spectral object can be a response curve

Detector and biological-response functions are neither amplitude spectra nor power spectra. `continuous_spectrum.representation` therefore includes `response_curve`.

### Frequency transformation should be graph-visible

The quartz examples intentionally separate the 32,768 Hz resonator and the derived 1 Hz clock output into distinct phenomena connected by `DIVIDED_TO`. This keeps the source phenomenon, transformation, and output separately inspectable.

### Transduction does not imply carrier-frequency identity

The visual and auditory chains make the carrier change explicit. Optical radiation is converted by phototransduction into graded membrane-potential and synaptic signals; acoustic/mechanical motion is converted by cochlear hair cells into electrical activity carried by the auditory nerve. Those downstream signals have temporal spectra, but Atlas does not assign them the optical or acoustic carrier frequency unless a source actually supports that claim.

For these first qualitative downstream stages, `frequency_profile.type: unknown` means **the temporal spectrum is intentionally unspecified**, not that the transduction mechanism itself is unknown. The manifest constraints and provenance explain why a carrier frequency is not copied across the transformation.

The CIE LMS standard-observer response curve remains a descriptive sensitivity model. It is not treated as the physical optical source of phototransduction; the incident-photon stimulus is represented as its own phenomenon.

### Population reference ranges are not time series

The AHA 60–100 bpm resting-adult range is a population-level event-rate reference. The ventricular activation, arterial pulse, and PPG records retain that semantics as event-rate ranges when they reuse the reference. Atlas does not reinterpret the range as evidence that one signal traces a 1.0–1.6667 Hz beat-to-beat frequency track over time.

The cardiac chain still keeps ventricular electrical activation, arterial pulse propagation, and PPG optical observation as separate phenomena because their observables, mechanisms, and timing differ. Electrical activation precedes contraction/ejection, and the peripheral pulse arrives after pre-ejection and propagation delays.

## Still missing from the initial target set

- retinal-network and perceived-color stages beyond the cone synapse
- central auditory / perceived-pitch stages beyond the auditory nerve
- a genuinely measured time-varying or nonstationary spectral example
- an explicit weak numerical coincidence used to test non-causal matching

Those examples should continue to change the schema when the real data demands it; the schema should not force them into the current shapes.
