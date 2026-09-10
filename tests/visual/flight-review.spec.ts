import { expect, test, type Page } from "@playwright/test";
import type { ExplorerItem } from "../../src/lib/corpus";

const route = "/atlas-spectra/flight/";
const experience = (page: Page) => page.locator(".flight-experience");
const coordinate = async (page: Page) => Number(await experience(page).getAttribute("data-coordinate"));
async function ready(page: Page, url = route) {
  await page.goto(url);
  await expect(experience(page)).toHaveAttribute("data-ready", "true");
  await expect(experience(page)).toHaveAttribute("data-renderer", "ready", { timeout: 25_000 });
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
}

// Test-only data enters via the hydrated Astro island's observed props attribute.
// The production component and its actual click handlers still run; neither
// synthetic records nor a fixture route are added to the scientific corpus.
// Astro's JSON subset uses [0, value/object] and [1, array-of-tuples].
async function replaceFlightItems(page: Page, items: ExplorerItem[]) {
  await experience(page).evaluate((element, records) => {
    const island = element.closest("astro-island");
    const raw = island?.getAttribute("props");
    if (!island || !raw || !island.getAttribute("component-url")?.includes("FrequencyFlight")) {
      throw new Error("Expected the hydrated FrequencyFlight island");
    }
    function encode(value: unknown): unknown[] {
      if (Array.isArray(value)) return [1, value.map(encode)];
      if (value !== null && typeof value === "object") {
        return [0, Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry)]))];
      }
      return value === undefined ? [0] : [0, value];
    }
    const props = JSON.parse(raw) as Record<string, unknown[]>;
    if (props.items?.[0] !== 1) throw new Error("Astro items serialization changed");
    props.items = encode(records);
    props.lanes = encode(["Biological", "Optical"]);
    // The React adapter ignores hydration calls without the ssr marker.
    // Re-arm it before changing props; Astro invokes the adapter with the
    // existing React root and removes the marker after this test-only render.
    island.setAttribute("ssr", "");
    island.setAttribute("props", JSON.stringify(props));
  }, items);
  await expect(page.locator(".flight-catalog-note")).toContainText(`${items.length} positioned · 0 unpositioned`);
}

function fixture(): ExplorerItem {
  return {
    id: "test.multiline", name: "Synthetic multi-line fixture", summary: "Test-only navigation fixture",
    domains: ["testing"], lane: "Biological", profileType: "discrete_lines",
    axisKind: "temporal_frequency", markKind: "lines",
    display: { lowHz: 1, highHz: 1e8, positionsHz: [1, 10000, 10001, 1e8], mode: "native", nativeLabel: "fixture", note: "fixture" },
    sources: [], provenance: [], relationships: [],
  };
}

test("Flight finds domain-only metadata with case and whitespace normalization", async ({ page }) => {
  await ready(page);
  const search = page.getByLabel("Find a phenomenon");
  await search.fill("  HEMODYNAMICS  ");
  await expect(page.locator('.flight-records [data-record-id="cardiology.arterial-pulse.resting-adult"]')).toBeVisible();
  await search.fill("clinical-neurophysiology");
  const eeg = page.locator('.flight-records [data-record-id="neuroscience.eeg.alpha-band"]');
  await expect(eeg).toBeVisible();
  await eeg.click();
  await expect(page.locator(".flight-inspector")).toHaveAttribute("data-selected-id", "neuroscience.eeg.alpha-band");
  await search.fill("no-such-domain-12345");
  await expect(page.locator(".flight-records button")).toHaveCount(0);
});

test("A4 reference evidence is traceable and separate from profile provenance", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page, `${route}?at=${Math.log10(440)}&entity=perception.pitch.a4-reference`);
  const reference = page.getByRole("region", { name: "Reference coordinate evidence", exact: true });
  const provenance = page.getByRole("region", { name: "Record provenance", exact: true });
  await expect(reference).toHaveAttribute("data-claim-id", "claim.pitch.a4-440hz-reference");
  await expect(reference).toHaveAttribute("data-evidence-target", "/claims/0/object");
  await expect(reference).toContainText("established reference · reviewed");
  await expect(reference).not.toContainText("model derived");
  await expect(provenance).toContainText("/frequency_profile");
  await expect(provenance).toContainText("model derived · reviewed");
  await reference.getByText("Evidence details & sources", { exact: true }).click();
  await expect(reference.getByRole("link", { name: "Dynamics of Pitch Perception in the Auditory Cortex" }))
    .toHaveAttribute("href", "https://pmc.ncbi.nlm.nih.gov/articles/PMC11924889/");
  await expect(reference).toContainText("Source location: Introduction:");
  await expect(reference.locator("[data-source-id]")).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/screenshots/flight-reference-evidence.png", fullPage: true });
});

test("later spectral labels search and previous-next retain every actual line", async ({ page }) => {
  await ready(page, `${route}?at=3.9`);
  await replaceFlightItems(page, [fixture()]);
  const label = page.locator('.flight-label[data-record-id="test.multiline"]');
  await expect(label).toHaveAttribute("data-anchor-coordinate", "4");
  await label.click();
  await expect.poll(() => coordinate(page)).toBe(4);
  const next = page.getByRole("button", { name: /Next landmark/ });
  const previous = page.getByRole("button", { name: /Previous landmark/ });
  const closeLine = Math.log10(10001);
  await next.click();
  await expect.poll(() => coordinate(page)).toBe(closeLine);
  await page.waitForFunction((at) => Number(new URL(location.href).searchParams.get("at")) === at, closeLine);
  await next.click();
  await expect.poll(() => coordinate(page)).toBe(8);
  await expect(next).toBeDisabled();
  // Catalog selection must also stay at the nearest later line, not line 0.
  await page.getByLabel("Find a phenomenon").fill("Synthetic multi-line");
  await page.locator('.flight-records [data-record-id="test.multiline"]').click();
  await expect.poll(() => coordinate(page)).toBe(8);
  for (const stop of [closeLine, 4, 0]) {
    await previous.click();
    await expect.poll(() => coordinate(page)).toBe(stop);
  }
  await expect(previous).toBeDisabled();
});

test("missing claim evidence is not replaced by profile provenance", async ({ page }) => {
  await ready(page);
  const item: ExplorerItem = {
    ...fixture(), id: "test.reference", name: "Reference without evidence", profileType: "unknown", markKind: "reference",
    display: { lowHz: 440, highHz: 440, nativeLabel: "440 Hz", note: "Test-only reference", mode: "claim-reference",
      referenceClaim: { id: "claim.test.missing-evidence", target: "/claims/1/object" } },
    provenance: [{ target: "/frequency_profile", evidence: { basis: "model_derived", review_status: "reviewed" } }],
  };
  await replaceFlightItems(page, [item]);
  await page.locator('.flight-records [data-record-id="test.reference"]').click();
  const reference = page.getByRole("region", { name: "Reference coordinate evidence", exact: true });
  await expect(reference).toHaveAttribute("data-evidence-target", "/claims/1/object");
  await expect(reference).toContainText("No evidence is attached to this reference claim.");
  await expect(reference).not.toContainText("model derived");
  await expect(page.getByRole("region", { name: "Record provenance", exact: true })).toContainText("model derived · reviewed");
});
