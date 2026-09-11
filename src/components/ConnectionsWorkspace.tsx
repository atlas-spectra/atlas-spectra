import type { ExplorerItem } from "../lib/corpus";
import type { ConnectionCatalog } from "../lib/recorded-connections";
import type { NumericalInput } from "../lib/numerical-neighbors";
import NumericalNeighbors from "./NumericalNeighbors";
import RecordedConnections from "./RecordedConnections";

/** One island payload, independent numerical and recorded-graph state. */
export default function ConnectionsWorkspace({ items, catalog, inputs, base }: {
  items: ExplorerItem[]; catalog: ConnectionCatalog; inputs: NumericalInput[]; base: string;
}) {
  return <><NumericalNeighbors items={items} inputs={inputs} catalog={catalog} base={base} />
    <RecordedConnections items={items} catalog={catalog} base={base} /></>;
}
