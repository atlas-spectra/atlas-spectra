import { explorerItems, manifests } from "./corpus";
import { buildNumericalInputs } from "./numerical-neighbors";

/** Raw manifests never cross the hydrated island boundary. */
export const numericalInputs = buildNumericalInputs(manifests, explorerItems);
