import { expect, test, type Page } from "@playwright/test";
const route = "/atlas-spectra/connections/";
const heart = "biology.heart.resting-adult-rate", tick = "timekeeping.quartz-wristwatch.one-second-tick", quartz = "timekeeping.quartz-wristwatch.resonance";
const numerical = "relationship.heart-lower-bound-to-quartz-one-hz";
const hair = "hearing.cochlea.hair-cell-electrical-signal", electrical = "cardiology.ventricular-activation.resting-adult";
const reference = "perception.pitch.a4-reference";
const app = (page: Page) => page.locator(".connections-app");
async function ready(page: Page, search = "") { await page.goto(route + search); await expect(app(page)).toHaveAttribute("data-ready", "true"); }
async function capture(page: Page, name: string) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `artifacts/screenshots/${name}.png`, fullPage: true }); }

test("Connections is a quiet independent workspace with no Flight renderer request", async ({ page }) => {
  const requests: string[] = []; page.on("request", (request) => requests.push(request.url()));
  await ready(page); await expect(page.getByRole("heading", { name: "Why are these connected?", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Connections", exact: true })).toBeVisible();
  await expect(app(page)).toHaveAttribute("data-entity-id", heart); await expect(app(page)).toHaveAttribute("data-edge-id", "");
  await expect(page.locator(`[data-edge-choice="${numerical}"]`)).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0); expect(requests.some((url) => /FlightScene|FrequencyFlight/.test(url))).toBe(false);
});
test("the heart-watch link clearly says numerical coincidence and preserves its boundary derivation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page, `?entity=${heart}`);
  const choice = page.locator(`[data-edge-choice="${numerical}"]`); await choice.focus(); await choice.press("Enter"); await expect(choice).toBeFocused();
  await expect(app(page)).toHaveAttribute("data-edge-id", numerical);
  await expect(page.locator(".connections-meaning")).toContainText("Numerical coincidence");
  await expect(page.locator(".connections-meaning")).toContainText("not evidence of a shared physical mechanism");
  await expect(page.locator(".connections-evidence")).toContainText("lower endpoint");
  await expect(page.locator(".connections-derivation")).toContainText("60 beats/minute");
  await expect(page.locator(".connections-evidence")).toHaveAttribute("data-owner-id", heart);
  await expect(page.locator('.connections-evidence [data-source-id="source.aha.resting-heart-rate"]')).toBeVisible();
  await expect(page.locator(`.connections-endpoint[data-endpoint-id="${heart}"]`)).toContainText("1–1.67 beat events/s");
  await expect(page.locator(".connections-direction")).toContainText("not signal flow or causation");
  await expect(page.locator(".connections-live")).toContainText("Numerical coincidence");
  await capture(page, "connections-numerical");
});
test("continue from the clock exposes an incoming physical link without reversing either edge", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page, `?entity=${heart}&edge=${numerical}`);
  await page.locator(`.connections-endpoint[data-endpoint-id="${tick}"] button`).click();
  await expect(app(page)).toHaveAttribute("data-entity-id", tick); await expect(app(page)).toHaveAttribute("data-edge-id", numerical);
  await expect(page.locator(`[data-edge-choice="${numerical}"]`)).toContainText("Incoming");
  const divider = page.locator('.connections-edge-list button[data-category="physical"]').filter({ hasText: "divided to" });
  await expect(divider).toHaveCount(1); const edgeId = await divider.getAttribute("data-edge-choice"); await divider.click();
  await expect(page.locator(".connections-meaning")).toContainText("Physical relationship");
  await expect(page.locator('[data-pair-role="source"]')).toHaveAttribute("data-pair-record", quartz);
  await expect(page.locator('[data-pair-role="target"]')).toHaveAttribute("data-pair-record", tick);
  await expect(page.locator('[data-pair-role="source"] [data-pair-mark]')).toHaveAttribute("data-log", String(Math.log10(32768)));
  await expect(page.locator('[data-pair-role="target"] [data-pair-mark]')).toHaveAttribute("data-log", "0");
  await expect(page.locator(".connections-scale")).toHaveAttribute("data-placement", "lower");
  expect(new URL(page.url()).searchParams.get("edge")).toBe(edgeId); await capture(page, "connections-physical");
  await page.goBack(); await expect(app(page)).toHaveAttribute("data-edge-id", numerical); await expect(app(page)).toHaveAttribute("data-entity-id", tick);
  await page.goBack(); await expect(app(page)).toHaveAttribute("data-entity-id", heart);
  await page.goForward(); await expect(app(page)).toHaveAttribute("data-entity-id", tick);
});
test("unpositioned observations stay connected but have no mark or invented deep-link coordinate", async ({ page }) => {
  await ready(page, `?entity=${hair}`);
  await page.locator(".connections-edge-list button").filter({ hasText: "A4 sound" }).click();
  await expect(page.locator(`[data-pair-record="${hair}"] [data-pair-mark]`)).toHaveCount(0);
  const endpoint = page.locator(`.connections-endpoint[data-endpoint-id="${hair}"]`);
  await expect(endpoint).toContainText("No frequency assigned");
  await expect(page.locator(".connections-scale")).toHaveAttribute("data-placement", "unpositioned");
  for (const mode of ["Atlas", "Flight"]) {
    const link = await endpoint.getByRole("link", { name: mode + " ↗", exact: true }).getAttribute("href");
    const url = new URL(link!, "https://example.test");
    expect(url.searchParams.get("entity")).toBe(hair); expect(url.searchParams.has("center")).toBe(false); expect(url.searchParams.has("at")).toBe(false);
  }
  await capture(page, "connections-unpositioned");
});
test("claim-reference endpoints retain their exact quantitative evidence and visible qualifier", async ({ page }) => {
  await ready(page, `?entity=${reference}`); await page.locator(".connections-edge-list button").first().click();
  const endpoint = page.locator(`.connections-endpoint[data-endpoint-id="${reference}"]`);
  await expect(endpoint.locator(".connections-quantity-kind")).toContainText("Claim reference");
  await endpoint.locator(".connections-observation-evidence > summary").click();
  await expect(endpoint.getByRole("region", { name: "Reference coordinate evidence" })).toBeVisible();
  await expect(endpoint.getByRole("region", { name: "Record provenance" })).toBeVisible();
  await expect(endpoint.locator(".recorded-connections-link")).toHaveCount(0);
});
test("search supports aliases, keyboard selection and no-results recovery without assigning a different record", async ({ page }) => {
  await ready(page); await page.getByLabel("Find an observation", { exact: true }).fill("  ECG  ");
  const result = page.locator(`[data-search-record="${electrical}"]`); await expect(result).toBeVisible(); await result.focus(); await result.press("Enter");
  await expect(app(page)).toHaveAttribute("data-entity-id", electrical); await expect(page.getByLabel("Find an observation", { exact: true })).toHaveValue("");
  await page.getByLabel("Find an observation", { exact: true }).fill("nothing-will-match-this-xyz");
  await expect(page.getByRole("group", { name: "Matching observations" })).toContainText("No observations match");
  await expect(app(page)).toHaveAttribute("data-entity-id", electrical);
  await page.getByRole("button", { name: "Clear search", exact: true }).click(); await expect(page.getByLabel("Find an observation", { exact: true })).toHaveValue("");
});
test("category filtering and empty record states never manufacture connections", async ({ page }) => {
  await ready(page, `?entity=${heart}&kind=physical`);
  await expect(page.locator(".connections-empty-list")).toContainText("No links match this category");
  await expect(page.locator(".connections-edge-list button")).toHaveCount(0);
  await page.getByRole("button", { name: "Show all types", exact: true }).click(); await expect(page.locator(`[data-edge-choice="${numerical}"]`)).toBeVisible();
  await page.getByLabel("Start with an observation", { exact: true }).selectOption("atomic.cesium-133.hyperfine-transition");
  await expect(page.locator(".connections-empty-list")).toContainText("No record-level connections");
  await expect(page.locator(".connections-empty-list")).toContainText("does not prove");
  await expect(app(page)).toHaveAttribute("data-edge-id", "");
});
test("deep links restore category and search but reject a foreign edge without changing its endpoints", async ({ page }) => {
  await ready(page, `?entity=${tick}&edge=${numerical}&kind=numerical&q=watch&utm_source=review`);
  await expect(app(page)).toHaveAttribute("data-edge-id", numerical); await page.reload(); await expect(app(page)).toHaveAttribute("data-ready", "true");
  await expect(app(page)).toHaveAttribute("data-entity-id", tick); await expect(app(page)).toHaveAttribute("data-edge-id", numerical);
  await expect(page.getByLabel("Find an observation", { exact: true })).toHaveValue("watch");
  expect(new URL(page.url()).searchParams.get("utm_source")).toBe("review");
  await ready(page, `?entity=${quartz}&edge=${numerical}`); await expect(app(page)).toHaveAttribute("data-entity-id", quartz);
  await expect(app(page)).toHaveAttribute("data-edge-id", ""); await expect(page.locator(".connections-meaning")).toHaveCount(0);
  await ready(page, "?entity=__proto__&edge=constructor&kind=not-real"); await expect(app(page)).toHaveAttribute("data-edge-id", "");
});
test("record details in Atlas and Flight open the same observation in Connections", async ({ page }) => {
  for (const mode of ["explore", "flight"]) {
    await page.goto(`/atlas-spectra/${mode}/?entity=${heart}`);
    const link = page.locator(".recorded-connections-link a").first(); await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", `${route}?entity=${heart}`); await link.click();
    await expect(app(page)).toHaveAttribute("data-ready", "true"); await expect(app(page)).toHaveAttribute("data-entity-id", heart);
  }
});
test("without JavaScript every indexed relationship retains source, target and owner links", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false }), page = await context.newPage();
  await page.goto("http://127.0.0.1:4321" + route);
  const fallback = page.locator("noscript .connections-static"); await expect(fallback).toBeVisible();
  expect(await fallback.locator("li").count()).toBeGreaterThan(0);
  await expect(fallback.getByRole("link", { name: "Original relationship evidence" }).first()).toBeVisible();
  await expect(fallback).toContainText("SAME NUMERICAL FREQUENCY AS"); await context.close();
});
test.describe("touch recorded connections", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("native taps browse both perspectives and keep quantities, icons and navigation inside narrow screens", async ({ page }) => {
    await ready(page, `?entity=${heart}`); await page.locator(`[data-edge-choice="${numerical}"]`).tap();
    await page.locator(`.connections-endpoint[data-endpoint-id="${tick}"] button`).tap(); await expect(app(page)).toHaveAttribute("data-entity-id", tick);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const icon of await page.locator(".connections-app .phenomenon-symbol svg").all()) {
        const box = await icon.boundingBox(), parent = await icon.locator("..").boundingBox();
        expect(box!.width).toBeLessThanOrEqual(parent!.width); expect(box!.height).toBeLessThanOrEqual(parent!.height);
      }
      for (const value of await page.locator(".connections-value").all()) {
        expect(await value.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 }); await capture(page, "connections-mobile");
  });
});
