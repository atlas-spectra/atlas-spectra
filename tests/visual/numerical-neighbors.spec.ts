import { expect, test, type Page } from "@playwright/test";
const route = "/atlas-spectra/connections/";
const heart = "biology.heart.resting-adult-rate", tick = "timekeeping.quartz-wristwatch.one-second-tick", quartz = "timekeeping.quartz-wristwatch.resonance";
const a4 = "acoustics.standard-pitch.a4-440hz", reference = "perception.pitch.a4-reference", hair = "hearing.cochlea.hair-cell-electrical-signal";
const edge = "relationship.heart-lower-bound-to-quartz-one-hz";
const panel = (p: Page) => p.locator(".numerical-panel");
const peer = (p: Page, id: string) => panel(p).locator(`[data-numerical-peer="${id}"]`);
const query = (id = heart, refs = false) => `?entity=${heart}&numbers=overlap&numbers_from=${id}${refs ? "&numbers_refs=include" : ""}`;
async function ready(p: Page, search = "") { await p.goto(route + search); await expect(p.locator(".connections-app")).toHaveAttribute("data-ready", "true"); await expect(p.locator("#numerical-trigger, #numerical-anchor")).toBeEnabled(); }
async function openDetails(p: Page, id: string) { await peer(p, id).getByText("Calculation & original observation evidence", { exact: true }).click(); }

test("numerical discovery starts closed, opens from current browsing observation and restores focus", async ({ page }) => {
  await ready(page, `?entity=${tick}`); await expect(panel(page)).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Find numerical neighbors", exact: true }); await trigger.focus(); await trigger.press("Enter");
  await expect(panel(page)).toHaveAttribute("data-numerical-anchor", tick); await expect(page.locator("#numerical-heading")).toBeFocused();
  await expect(panel(page).getByRole("checkbox")).not.toBeChecked();
  await panel(page).getByRole("button", { name: "Close numerical comparison" }).click(); await expect(trigger).toBeFocused();
  await expect(page.locator(".connections-app")).toHaveAttribute("data-entity-id", tick);
});
test("the heartbeat-watch numerical hit is explicitly a boundary, not the whole range", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page, query());
  await expect(panel(page)).toHaveAttribute("data-numerical-status", "complete");
  await expect(peer(page, tick)).toHaveAttribute("data-numerical-kind", "boundary-only");
  await expect(peer(page, tick)).toContainText("Only an endpoint matches—not the whole range.");
  await expect(panel(page).locator(".numerical-anchor-card")).toContainText("60–100");
  await panel(page).screenshot({ path: "artifacts/screenshots/numerical-heart-overview.png" });
  await openDetails(page, tick);
  const calculation = peer(page, tick).locator(".numerical-calculation > ul > li > code");
  await expect(calculation).toHaveCount(1); await expect(calculation).toContainText("∩ [1, 1] = [1, 1]");
  await expect(peer(page, tick)).toContainText("not spectral power");
  await panel(page).screenshot({ path: "artifacts/screenshots/numerical-heart-boundary.png" });
  await peer(page, tick).screenshot({ path: "artifacts/screenshots/numerical-boundary-detail.png" });
});
test("matching physiological reference ranges remain observations, not independent discoveries", async ({ page }) => {
  await ready(page, query()); const electrical = peer(page, "cardiology.ventricular-activation.resting-adult");
  await expect(electrical).toHaveAttribute("data-numerical-kind", "same-extent");
  await expect(electrical).toContainText("Event rate, not a waveform");
  await expect(panel(page).locator(".numerical-caution")).toContainText("may reuse the same reference range");
  await expect(page.locator(".connections-app")).toHaveAttribute("data-edge-id", "");
});
test("claim references require explicit opt-in and retain their reference qualifier", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page, query(a4));
  await expect(peer(page, reference)).toHaveCount(0); await panel(page).getByRole("checkbox").check();
  await expect(peer(page, reference)).toContainText("Navigational claim reference");
  await expect(peer(page, reference)).toHaveAttribute("data-numerical-kind", "same-extent");
  await panel(page).screenshot({ path: "artifacts/screenshots/numerical-a4-reference.png" });
  await panel(page).getByRole("checkbox").uncheck(); await expect(peer(page, reference)).toHaveCount(0);
});
test("a reference anchor is excluded until requested rather than silently treated as a spectrum", async ({ page }) => {
  await ready(page, query(reference)); await expect(panel(page)).toHaveAttribute("data-numerical-status", "anchor-excluded");
  await expect(panel(page).getByRole("button", { name: "Download calculation JSON" })).toBeDisabled();
  await panel(page).getByRole("checkbox").check(); await expect(panel(page)).toHaveAttribute("data-numerical-status", "complete");
  await expect(peer(page, a4)).toBeVisible();
});
test("unpositioned anchors remain unpositioned and cannot export an invented comparison", async ({ page }) => {
  await ready(page, query(hair)); await expect(panel(page)).toHaveAttribute("data-numerical-status", "anchor-excluded");
  await expect(panel(page).locator(".numerical-anchor-card")).toContainText("No frequency assigned");
  await expect(panel(page).locator("[data-numerical-peer]")).toHaveCount(0);
  await expect(panel(page).getByRole("button", { name: "Download calculation JSON" })).toBeDisabled();
});
test("no-overlap output does not claim physical independence or broaden the reference setting", async ({ page }) => {
  await ready(page, query(quartz)); await expect(panel(page)).toHaveAttribute("data-numerical-status", "complete");
  await expect(panel(page).locator(".numerical-empty")).toContainText("does not mean there are no physical relationships");
  await expect(panel(page).getByRole("checkbox")).not.toBeChecked();
});
test("numerical history and recorded-path state coexist without changing either set of endpoints", async ({ page }) => {
  const path = `&path=recorded&path_from=${quartz}&path_to=${tick}`;
  await ready(page, query() + path); await page.locator("#numerical-anchor").selectOption(a4);
  await expect(page.locator(".recorded-path-panel")).toHaveAttribute("data-path-from", quartz);
  await expect(page.locator(".recorded-path-panel")).toHaveAttribute("data-path-to", tick);
  await page.goBack(); await expect(panel(page)).toHaveAttribute("data-numerical-anchor", heart);
  await page.goForward(); await expect(panel(page)).toHaveAttribute("data-numerical-anchor", a4);
  await page.reload(); await expect(panel(page)).toHaveAttribute("data-numerical-anchor", a4);
  await panel(page).getByRole("button", { name: "Close numerical comparison" }).click();
  expect(new URL(page.url()).searchParams.get("numbers")).toBeNull(); expect(new URL(page.url()).searchParams.get("path_from")).toBe(quartz);
});
test("a known recorded link is opened separately with its exact ID and original evidence", async ({ page }) => {
  await ready(page, query()); await openDetails(page, tick);
  const link = peer(page, tick).getByRole("link", { name: /Numerical coincidence · open original/ });
  const url = new URL(await link.getAttribute("href") ?? "", page.url());
  expect(url.searchParams.get("edge")).toBe(edge); expect(url.searchParams.get("numbers_from")).toBe(heart);
  await link.click(); await expect(page.locator(".connections-app")).toHaveAttribute("data-edge-id", edge);
  await expect(panel(page)).toHaveAttribute("data-numerical-anchor", heart);
  await expect(page.locator(".connections-derivation")).toContainText("60 beats/minute");
});
test("the JSON export includes exact numerical snapshots, exclusions and reconciled search counts", async ({ page }) => {
  await ready(page, query()); const event = page.waitForEvent("download"); await panel(page).getByRole("button", { name: "Download calculation JSON" }).click();
  const download = await event; expect(download.suggestedFilename()).toBe("atlas-spectra-numerical-overlap.json");
  const stream = await download.createReadStream(); let text = ""; for await (const chunk of stream!) text += chunk.toString();
  const report = JSON.parse(text); expect(report).toMatchObject({ schemaVersion: "0.1.0", interpretation: "numerical-only", reviewStatus: "unreviewed-computation", status: "complete", anchorId: heart });
  expect(report.anchor.quantityTargets).toEqual(["/frequency_profile/rate"]);
  expect(report.counts.matches).toBe(report.matches.length); expect(report.counts.excludedPeers).toBe(report.exclusions.length);
  expect(report.counts.comparedPeers + report.counts.excludedPeers).toBe(report.counts.catalogRecords - 1);
  expect(report.matches.find((m: { peer: { id: string } }) => m.peer.id === tick)).toMatchObject({ kind: "boundary-only", intersections: [{ peerHz: [1, 1], sharedHz: [1, 1] }] });
  expect(report.exclusions.some((e: { id: string }) => e.id === hair)).toBe(true); expect(report).not.toHaveProperty("confidence");
  const schema = await page.request.get("/atlas-spectra/data/numerical-neighbor-report.schema.json"); expect(schema.ok()).toBe(true);
  expect((await schema.json()).properties.interpretation.const).toBe("numerical-only");
});
test("malformed numerical parameters stay restrictive and preserve original graph selection", async ({ page }) => {
  await ready(page, `?entity=${tick}&numbers=overlap&numbers_from=missing&numbers_refs=true`);
  await expect(panel(page)).toHaveAttribute("data-numerical-status", "anchor-required"); await expect(page.locator("#numerical-anchor")).toHaveValue("");
  await expect(panel(page).getByRole("checkbox")).not.toBeChecked(); await expect(page.locator(".connections-app")).toHaveAttribute("data-entity-id", tick);
});
test("keyboard selection retains focus and reselecting settings creates no duplicate history", async ({ page }) => {
  await ready(page, query()); const select = page.locator("#numerical-anchor"); await select.focus(); const before = await page.evaluate(() => history.length);
  await select.selectOption(heart); await expect(select).toBeFocused(); expect(await page.evaluate(() => history.length)).toBe(before);
  await select.selectOption(tick); await expect(select).toBeFocused();
});
test("numerical comparisons require no WebGL, new renderer or graph mutation", async ({ page }) => {
  const requests: string[] = []; page.on("request", (r) => requests.push(r.url()));
  await ready(page, query()); await expect(page.locator("canvas")).toHaveCount(0);
  expect(requests.some((url) => /FrequencyFlight|FlightScene/.test(url))).toBe(false);
  await expect(page.locator(".connections-footer")).toContainText("13 stored record-level relationships");
});
test.describe("touch numerical neighbors", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("native taps reveal exact calculations and keep controls contained at narrow widths", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" }); await ready(page, `?entity=${heart}`);
    await page.getByRole("button", { name: "Find numerical neighbors", exact: true }).tap();
    await peer(page, tick).getByText("Calculation & original observation evidence", { exact: true }).tap();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const control of await panel(page).locator("button, select").all()) {
        const box = await control.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width); expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      const calculation = peer(page, tick).locator(".numerical-calculation > ul > li > code");
      await expect(calculation).toHaveCount(1); await expect(calculation).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 844 }); await panel(page).screenshot({ path: "artifacts/screenshots/numerical-mobile.png" });
  });
});
