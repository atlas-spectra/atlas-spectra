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

## Schema pressure discovered

### Wavelength is a native spectral coordinate

Authoritative color-science datasets are naturally tabulated in wavelength. The CIE 2006 LMS cone fundamentals CSV is published from 390 nm to 830 nm in 1 nm increments (441 samples). v0 therefore permits a wavelength axis for continuous spectra rather than requiring an eager conversion to temporal frequency.

### A spectral object can be a response curve

Detector and biological-response functions are neither amplitude spectra nor power spectra. `continuous_spectrum.representation` therefore includes `response_curve`.

### Frequency transformation should be graph-visible

The quartz examples intentionally separate the 32,768 Hz resonator and the derived 1 Hz clock output into distinct phenomena connected by `DIVIDED_TO`. This keeps the source phenomenon, transformation, and output separately inspectable.

## Still missing from the initial target set

- light source → cone response → retinal encoding → perceived color chain
- sound → cochlear response → neural encoding → perceived pitch chain
- cardiac electrical → mechanical → pressure/optical sensing chain
- a time-varying or nonstationary spectral example
- an explicit weak numerical coincidence used to test non-causal matching

Those examples should continue to change the schema when the real data demands it; the schema should not force them into the current shapes.
