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
| EEG alpha band | frequency band | temporal frequency |
| CIE 2006 LMS cone fundamentals, 2° | continuous response curve | wavelength |
| Incident optical stimulus at a cone photoreceptor | unresolved optical spectrum | wavelength |
| Cone photoreceptor electrical response | unresolved downstream signal | temporal frequency |
| Cone synaptic glutamate output | unresolved downstream signal | temporal frequency |
| Post-receptoral color-opponent neural signal | unresolved downstream signal | temporal frequency |
| Human hue perception | unresolved perceptual attribute | other |
| Cochlear hair-cell electrical response | unresolved downstream signal | temporal frequency |
| Auditory nerve electrical signal | unresolved downstream signal | temporal frequency |
| Auditory cortical pitch representation | unresolved downstream signal | temporal frequency |
| A4-like 440 Hz pitch percept | unresolved perceptual attribute | temporal-frequency-like reference |
| Resting adult ventricular electrical activation | event rate | event rate |
| Resting adult arterial pulse events | event rate | event rate |
| Resting adult PPG optical intensity modulation | event rate | event rate |
| Resting adult electrical PPG pulse observations | event rate | event rate |
| GW150914 gravitational-wave strain chirp | time-varying frequency track | temporal frequency |

## Schema pressure discovered

### Wavelength is a native spectral coordinate

Authoritative color-science datasets are naturally tabulated in wavelength. The CIE 2006 LMS cone fundamentals CSV is published from 390 nm to 830 nm in 1 nm increments (441 samples). v0 therefore permits a wavelength axis for continuous spectra rather than requiring an eager conversion to temporal frequency.

### A spectral object can be a response curve

Detector and biological-response functions are neither amplitude spectra nor power spectra. `continuous_spectrum.representation` therefore includes `response_curve`.

### A named frequency band is not automatically a rhythm

The IFCN EEG glossary defines the alpha **band** as 8–13 Hz inclusive, while the alpha **rhythm** has additional topographic, behavioral, and reactivity criteria. The seed corpus therefore includes the alpha band as a `frequency_band` classification without silently asserting that every 8–13 Hz EEG component is the physiological alpha rhythm.

### Frequency transformation should be graph-visible

The quartz examples intentionally separate the 32,768 Hz resonator and the derived 1 Hz clock output into distinct phenomena connected by `DIVIDED_TO`. This keeps the source phenomenon, transformation, and output separately inspectable.

### Transduction does not imply carrier-frequency identity

The visual and auditory chains make changes in the **physical observable** explicit: optical radiation drives photoreceptor electrical/chemical responses, and acoustic/mechanical motion drives cochlear electrical and neural responses. The downstream temporal spectra are intentionally left unresolved unless a source supports a more specific representation.

Atlas therefore does **not assume** that an input carrier frequency should simply be copied onto a downstream electrical or neural signal. That is weaker than claiming that no stimulus-locked component can remain: an unresolved downstream spectrum may still contain components related to stimulus timing or frequency, and those should be added when supported by evidence.

For these first qualitative downstream stages, `frequency_profile.type: unknown` means **the temporal spectrum is intentionally unspecified**, not that the transduction mechanism itself is unknown.

The CIE LMS standard-observer response curve remains a descriptive sensitivity model. It is not treated as the physical optical source of phototransduction; the incident-photon stimulus is represented as its own phenomenon.

### Percepts are not hidden oscillators

Hue and pitch are represented as perceptual phenomena rather than as physical oscillators. The color chain now continues from cone output into post-receptoral opponent processing and then hue perception. The auditory chain continues from auditory-nerve activity into a cortical pitch representation and then a pitch percept.

A percept may still have a frequency-related reference. For example, a 440 Hz pure tone can evoke a pitch described as 440 Hz. Atlas stores that perceptual reference separately from the physical spectrum of the underlying neural activity. Likewise, hue can be related to spectral input without becoming a one-to-one wavelength label: trichromatic matching, opponent processing, mixtures, adaptation, and context all matter.

### Population reference ranges are not time series

The AHA 60–100 bpm resting-adult range is a population-level event-rate reference. The ventricular activation, arterial pulse, PPG optical modulation, and electrical PPG records retain that semantics as event-rate ranges when they reuse the reference. Atlas does not reinterpret the range as evidence that one signal traces a 1.0–1.6667 Hz beat-to-beat frequency track over time.

The cardiac sensing chain also separates two PPG stages that are easy to conflate: arterial blood-volume changes **modulate the tissue optical signal**, and the photodetector then **transduces that optical variation into an electrical PPG signal**. Ventricular electrical activation, arterial propagation, tissue optical modulation, and detector output therefore remain separate phenomena with different observables and mechanisms.

### Time-varying profiles require time-varying evidence

GW150914 is the seed corpus's first genuine `time_varying` example. LIGO measured a transient strain signal whose frequency swept upward from roughly 35 Hz to 250 Hz during the binary-black-hole merger, and GWOSC publishes the calibrated strain time series. That is qualitatively different evidence from converting a static population range into frequency units.

### Same number is the weakest relationship

The lower endpoint of the 60–100 bpm adult resting-heart-rate reference converts to 1 event/s, which numerically matches the quartz clock's 1 Hz output. The corpus encodes this with `SAME_NUMERICAL_FREQUENCY_AS`, `category: numerical`, and `mechanism_status: none`.

That edge exists precisely to prevent a future discovery engine or UI from turning a numerical match into a claim of resonance, coupling, entrainment, or shared mechanism.

## Initial target coverage

The initial adversarial target set from issue #2 is now represented:

- scalar periodic frequency
- explicit frequency band
- discrete-line spectrum
- continuous response curve
- genuine time-varying/nonstationary frequency behavior
- event-rate representation
- quantum transition
- light stimulus → cone response → retinal/post-receptoral processing → perceived color
- sound → cochlear response → neural/cortical encoding → perceived pitch
- cardiac electrical activation → arterial mechanics → optical modulation → wearable electrical observation
- quartz resonance → frequency division → one-second clock output
- atomic transition → atomic timekeeping reference
- molecular vibrational spectroscopy
- explicit weak numerical coincidence with no physical mechanism

The corpus should continue to evolve when new domains expose schema weaknesses, but broad catalog expansion no longer needs to wait for these initial ontology stress tests.
