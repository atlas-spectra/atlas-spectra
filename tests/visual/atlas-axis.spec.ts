import { expect, test } from "@playwright/test";
import { atlasAxisTicks } from "../../src/lib/atlas-axis";
test("close-zoom ticks budget for mobile pixels rather than a fixed fifth-decade", () => {
  const view = { center: 0.11, span: 1.2 };
  const mobile = atlasAxisTicks(view, 262), desktop = atlasAxisTicks(view, 800);
  expect(mobile.length).toBeGreaterThan(0);
  expect(mobile.length).toBeLessThan(desktop.length);
  for (let i = 1; i < mobile.length; i++) expect((mobile[i].log - mobile[i - 1].log) / view.span * 262).toBeGreaterThanOrEqual(96);
});
test("tick generation remains finite and bounded across zoom and coordinate scales", () => {
  for (const center of [-300, -1, 0, 10, 300]) for (const span of [1.2, 4, 16, 600]) for (const width of [150, 800, 2000]) {
    const ticks = atlasAxisTicks({ center, span }, width);
    expect(ticks.length).toBeLessThanOrEqual(101);
    for (const tick of ticks) {
      expect(Number.isFinite(tick.log)).toBe(true);
      expect(tick.log).toBeGreaterThanOrEqual(center - span / 2 - 1e-10);
      expect(tick.log).toBeLessThanOrEqual(center + span / 2 + 1e-10);
    }
  }
});
test("invalid axes cannot enter a tick loop", () => {
  expect(atlasAxisTicks({ center: Infinity, span: 1 }, 300)).toEqual([]);
  expect(atlasAxisTicks({ center: 0, span: 0 }, 300)).toEqual([]);
  expect(atlasAxisTicks({ center: 0, span: NaN }, 300)).toEqual([]);
  expect(atlasAxisTicks({ center: 0, span: 1 }, 0)).toEqual([]);
});
