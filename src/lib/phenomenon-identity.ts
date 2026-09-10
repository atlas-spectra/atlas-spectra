import type { ExplorerItem } from "./corpus";

/** Editorial presentation only: no coordinates, measurements, or evidence live here. */
export type PhenomenonSymbol = "heart" | "artery" | "electrodes" | "brain" | "fork" | "ear" | "crystal" | "watch" | "molecule" | "atom" | "eye" | "light" | "sensor" | "nerve" | "cell" | "synapse" | "color" | "gravity" | "record";
export interface PhenomenonIdentity {
  title: string;
  subtitle: string;
  symbol: PhenomenonSymbol;
  aliases?: string;
}

// Keyed by canonical ID, never inferred from equal frequencies or neighboring marks.
export const PHENOMENON_IDENTITIES: Readonly<Record<string, PhenomenonIdentity>> = {
  "biology.heart.resting-adult-rate": { title: "Heartbeat", subtitle: "Beats counted", symbol: "heart", aliases: "heart rate cardiac cycle" },
  "cardiology.arterial-pulse.resting-adult": { title: "Arterial pulse", subtitle: "Pressure pulses arriving", symbol: "artery", aliases: "artery blood vessel pulse wave" },
  "cardiology.ventricular-activation.resting-adult": { title: "Heart electricity", subtitle: "Ventricular activations", symbol: "electrodes", aliases: "electrical activation ECG EKG electrodes" },
  "neuroscience.eeg.alpha-band": { title: "EEG alpha", subtitle: "Brain-signal frequency band", symbol: "brain" },
  "acoustics.standard-pitch.a4-440hz": { title: "A4 sound", subtitle: "Acoustic tuning reference", symbol: "fork", aliases: "tone tuning fork" },
  "perception.pitch.a4-reference": { title: "A4 as heard", subtitle: "Perceived pitch reference", symbol: "ear", aliases: "percept hearing" },
  "hearing.auditory-cortex.pitch-representation": { title: "Pitch in the cortex", subtitle: "Neural pitch representation", symbol: "brain" },
  "hearing.auditory-nerve.electrical-signal": { title: "Auditory nerve", subtitle: "Electrical nerve signal", symbol: "nerve" },
  "hearing.cochlea.hair-cell-electrical-signal": { title: "Inner-ear hair cell", subtitle: "Electrical cell response", symbol: "cell", aliases: "cochlear cochlea" },
  "timekeeping.quartz-wristwatch.resonance": { title: "Quartz crystal", subtitle: "Mechanical resonator", symbol: "crystal", aliases: "watch oscillator" },
  "timekeeping.quartz-wristwatch.one-second-tick": { title: "Watch tick", subtitle: "Divided clock output", symbol: "watch", aliases: "one second quartz" },
  "molecular.carbon-dioxide.bending-mode": { title: "CO₂ vibration", subtitle: "Molecular bending mode", symbol: "molecule", aliases: "carbon dioxide CO2" },
  "atomic.cesium-133.hyperfine-transition": { title: "Cesium transition", subtitle: "Atomic time reference", symbol: "atom", aliases: "caesium atomic clock" },
  "vision.cie-2006.lms-cone-fundamentals-2deg": { title: "Eye cone sensitivity", subtitle: "Response to light wavelengths", symbol: "eye", aliases: "LMS cones optical response" },
  "vision.cone-phototransduction.incident-optical-stimulus": { title: "Light entering the eye", subtitle: "Incident optical stimulus", symbol: "light" },
  "vision.cone-phototransduction.membrane-potential": { title: "Cone cell voltage", subtitle: "Electrical light response", symbol: "cell" },
  "vision.cone-synapse.glutamate-output": { title: "Cone chemical signal", subtitle: "Glutamate at the synapse", symbol: "synapse" },
  "vision.postreceptoral.color-opponent-signal": { title: "Color-opponent signal", subtitle: "Post-receptoral processing", symbol: "nerve" },
  "perception.color.hue": { title: "Color as perceived", subtitle: "Hue experience", symbol: "color" },
  "wearable.ppg.resting-adult-optical-variation": { title: "Pulse changing light", subtitle: "Tissue optical modulation", symbol: "light", aliases: "PPG photoplethysmography" },
  "wearable.ppg.resting-adult-pulse": { title: "Optical pulse sensor", subtitle: "Photodetector electrical output", symbol: "sensor", aliases: "PPG photoplethysmography wearable" },
  "astrophysics.gw150914.strain-chirp": { title: "Gravitational-wave chirp", subtitle: "GW150914 strain signal", symbol: "gravity" },
};

export function identityFor(item: ExplorerItem): PhenomenonIdentity {
  return Object.hasOwn(PHENOMENON_IDENTITIES, item.id)
    ? PHENOMENON_IDENTITIES[item.id]
    : { title: item.name, subtitle: item.lane, symbol: "record" };
}
export function identitySearchText(item: ExplorerItem): string {
  const identity = identityFor(item);
  return `${identity.title} ${identity.subtitle} ${identity.aliases ?? ""}`;
}
export const CARDIAC_OBSERVATION_IDS = [
  "biology.heart.resting-adult-rate",
  "cardiology.arterial-pulse.resting-adult",
  "cardiology.ventricular-activation.resting-adult",
] as const;
export function isCardiacObservation(id: string): boolean {
  return (CARDIAC_OBSERVATION_IDS as readonly string[]).includes(id);
}
