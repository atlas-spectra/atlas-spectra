import { expect, test } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";
import { atlasLandmarks, coordinateStops, distanceLabel, neighborAt, neighborsAt, reciprocalLabel } from "../../src/lib/atlas-neighborhood";

function item(id: string, low: number, high = low, lines?: number[]): ExplorerItem {
  return { id, name: id, summary: "test fixture", lane: "Biological", domains: ["biology"], profileType: lines ? "discrete_lines" : "frequency_band", axisKind: "temporal_frequency", markKind: lines ? "lines" : low === high ? "point" : "band", display: { lowHz: low, highHz: high, positionsHz: lines, mode: "native", nativeLabel: "fixture", note: "fixture" }, sources: [], provenance: [], relationships: [] };
}
test("neighborhood distance uses extents and actual spectral lines, not midpoint coincidences", () => {
  const range = item("range", 1, 100), lines = item("lines", 1, 100, [1, 100]);
  expect(neighborAt(range, 1)?.relation).toBe("within");
  expect(neighborAt(lines, 1)?.relation).toBe("lower");
  expect(neighborAt(lines, 1)?.distance).toBe(1);
  expect(neighborAt(lines, 1.8)?.coordinate).toBe(2);
  expect(distanceLabel(neighborAt(range, 1)!)).toBe("Inside this declared extent");
  expect(distanceLabel(neighborAt(item("point", 10), 0)!)).toBe("10× higher on the display scale");
});
test("neighborhood never positions unresolved, empty-line or non-finite records", () => {
  const unresolved = { ...item("unknown", 1), display: null };
  expect(neighborsAt([unresolved, item("bad", 0), item("missing-lines", 1, 100, [])], 1)).toEqual([]);
  expect(neighborsAt([item("x", 1)], NaN)).toEqual([]);
  expect(neighborAt(item("point", 1), Infinity)).toBeNull();
});
test("neighbor ties and landmarks are deterministic and use only supplied corpus records", () => {
  const a = item("a", 1), b = item("b", 100);
  expect(neighborsAt([b, a], 1).map((entry) => entry.item.id)).toEqual(["a", "b"]);
  expect(atlasLandmarks([a, b])).toEqual([]);
  const tone = item("acoustics.standard-pitch.a4-440hz", 440);
  expect(atlasLandmarks([tone])[0].coordinate).toBe(Math.log10(440));
  expect(coordinateStops([item("lines", 1, 10000, [10000, 1, 10000]), a])).toEqual([0, 4]);
});
test("reference and event semantics survive neighborhood calculations", () => {
  const reference = item("perception", 440);
  reference.markKind = "reference"; reference.display!.mode = "claim-reference";
  const event = item("event", 1, 1.667); event.axisKind = "event_rate";
  expect(neighborAt(reference, Math.log10(440))?.item.display?.mode).toBe("claim-reference");
  expect(neighborAt(event, 0)?.item.axisKind).toBe("event_rate");
  expect(reference.sources).toEqual([]); // No inferred supporting evidence or relationships.
  expect(neighborAt(reference, 0)?.item.relationships).toEqual([]);
});
test("the reciprocal ruler is finite and explicitly separate from record frequencies", () => {
  expect(reciprocalLabel(0)).toBe("1 s");
  expect(reciprocalLabel(3)).toBe("1 ms");
  expect(reciprocalLabel(Math.log10(440))).toBe("2.27 ms");
  expect(reciprocalLabel(NaN)).toBe("Unresolved");
  for (const at of [-300, -4, 9, 15, 300]) expect(reciprocalLabel(at)).not.toMatch(/NaN|Infinity/);
});
