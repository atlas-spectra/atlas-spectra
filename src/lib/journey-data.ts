// Build-time only. Client components import the pure model with type-only corpus imports.
import definitions from "../../presentation/journeys.json";
import { explorerItems, manifests } from "./corpus";
import { buildJourneys } from "./signal-journeys";
export const signalJourneys = buildJourneys(definitions, manifests, explorerItems);
