// Build-time only: client components receive a compact index and the original observations once.
import { manifests, explorerItems } from "./corpus";
import { buildRecordedConnections } from "./recorded-connections";
export const recordedConnections = buildRecordedConnections(manifests, explorerItems);
