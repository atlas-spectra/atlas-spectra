import { expect, test, type Page } from "@playwright/test";

const route = "/atlas-spectra/connections/";
const heart = "biology.heart.resting-adult-rate", tick = "timekeeping.quartz-wristwatch.one-second-tick", quartz = "timekeeping.quartz-wristwatch.resonance";
const electrical = "cardiology.ventricular-activation.resting-adult", sensor = "wearable.ppg.resting-adult-pulse";
const sound = "acoustics.standard-pitch.a4-440hz", hair = "hearing.cochlea.hair-cell-electrical-signal", nerve = "hearing.auditory-nerve.electrical-signal", pitch = "perception.pitch.a4-reference";
const numerical = "relationship.heart-lower-bound-to-quartz-one-hz";
const app = (page: Page) => page.locator(".connections-app");
const panel = (page: Page) => page.locator(".recorded-path-panel");
async function ready(page: Page, search = "") {
  await page.goto(route + search); await expect(app(page)).toHaveAttribute("data-ready", "true");
}
async function choose(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: "Find a recorded path", exact: true }).click();
  await page.getByRole("combobox", { name: "Path start observation" }).selectOption(from);
  await page.getByRole("combobox", { name: "Path destination observation" }).selectOption(to);
}
async function capturePanel(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await panel(page).screenshot({ path: `artifacts/screenshots/${name}.png` });
}
function pathQuery(from: string, to: string, extra: Record<string, string> = {}) {
  return "?" + new URLSearchParams({ path: "recorded", path_from: from, path_to: to, ...extra });
}

test("paths are opt-in with restrictive defaults and explicit opening and closing focus", async ({ page }) => {
  const requests: string[] = []; page.on("request", (request) => requests.push(request.url()));
  await ready(page, `?entity=${quartz}`); await expect(panel(page)).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Find a recorded path", exact: true }); await trigger.focus(); await trigger.press("Enter");
  await expect(page.locator("#recorded-path-heading")).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Path start observation" })).toHaveValue(quartz);
  await expect(page.getByRole("combobox", { name: "Path traversal direction" })).toHaveValue("forward");
  await expect(page.getByRole("combobox", { name: "Path link categories" })).toHaveValue("physical");
  await expect(panel(page)).toHaveAttribute("data-path-status", "invalid");
  await page.getByRole("button", { name: "Close path finder" }).click(); await expect(trigger).toBeFocused();
  expect(new URL(page.url()).searchParams.has("path")).toBe(false);
  expect(requests.some((url) => /FlightScene|FrequencyFlight/.test(url))).toBe(false); await expect(page.locator("canvas")).toHaveCount(0);
});

test("a three-link cardiac path opens each original link without changing the chosen endpoints", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 }); await ready(page); await choose(page, electrical, sensor);
  await expect(panel(page)).toHaveAttribute("data-path-status", "found");
  await expect(panel(page).locator("[data-path-edge]")).toHaveCount(3);
  await expect(panel(page)).toContainText("not a new end-to-end physical claim");
  await expect(panel(page).locator('[data-reversed="true"]')).toHaveCount(0);
  await capturePanel(page, "paths-cardiac");
  await page.locator("body").evaluate((el) => { el.dataset.pathMounted = "same"; });
  const choices = panel(page).getByRole("link", { name: /Inspect path link/ });
  for (let i = 0; i < 3; i++) {
    const row = panel(page).locator("[data-path-edge]").nth(i), id = await row.getAttribute("data-path-edge");
    await choices.nth(i).click(); await expect(app(page)).toHaveAttribute("data-edge-id", id!);
    await expect(page.locator("#connections-selected-detail")).toBeFocused();
    await expect(panel(page)).toHaveAttribute("data-path-from", electrical); await expect(panel(page)).toHaveAttribute("data-path-to", sensor);
    await expect(choices.nth(i)).toHaveAttribute("aria-current", "true");
  }
  await expect(page.locator("body")).toHaveAttribute("data-path-mounted", "same");
  // The transduction edge lives in resting-ppg-optical-variation.json, not its target.
  const evidence = page.locator(".connections-evidence");
  await expect(evidence).toHaveAttribute("data-owner-id", "wearable.ppg.resting-adult-optical-variation");
  await expect(evidence.locator("[data-source-id]")).toHaveCount(1);
  await expect(evidence.locator("[data-source-id]")).toHaveAttribute("data-source-id", "source.charlton.ppg-optical-modulation");
  await expect(evidence.locator("[data-source-id] a")).toHaveAttribute("href", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7612541/");
});

test("mixed heart-to-quartz browsing requires both opt-ins and keeps reverse direction explicit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 }); await ready(page); await choose(page, heart, quartz);
  await expect(panel(page)).toHaveAttribute("data-path-status", "not-found");
  await page.getByRole("combobox", { name: "Path link categories" }).selectOption("all");
  await expect(panel(page)).toHaveAttribute("data-path-status", "not-found");
  await page.getByRole("combobox", { name: "Path traversal direction" }).selectOption("either");
  await expect(panel(page)).toHaveAttribute("data-path-status", "found"); await expect(panel(page).locator("[data-path-edge]")).toHaveCount(2);
  await expect(panel(page).locator(`[data-path-edge="${numerical}"]`)).toHaveAttribute("data-path-category", "numerical");
  await expect(panel(page).locator(".recorded-path-warning")).toContainText("1 nonphysical link");
  await expect(panel(page).locator(".recorded-path-warning")).toContainText("1 reverse traversal");
  await expect(panel(page).locator('[data-reversed="true"]')).toContainText("Stored direction: Quartz crystal → Watch tick");
  await capturePanel(page, "paths-mixed");
  await panel(page).getByRole("link", { name: "Inspect path link 2 and evidence" }).click();
  await expect(app(page)).toHaveAttribute("data-entity-id", tick);
  await expect(page.locator('[data-pair-role="source"]')).toHaveAttribute("data-pair-record", quartz);
  await expect(page.locator('[data-pair-role="target"]')).toHaveAttribute("data-pair-record", tick);
  await expect(panel(page)).toHaveAttribute("data-path-from", heart); await expect(panel(page)).toHaveAttribute("data-path-to", quartz);
  await expect(page.locator(".connections-meaning")).toContainText("Physical relationship");
});

test("unpositioned and claim-reference steps retain their own quantities and proposed mechanism", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 }); await ready(page); await choose(page, sound, pitch);
  await expect(panel(page)).toHaveAttribute("data-path-status", "found");
  await expect(panel(page)).toContainText("No frequency assigned"); await expect(panel(page)).toContainText("claim reference");
  const last = panel(page).locator("[data-path-edge]").last();
  await expect(last).toContainText("Mechanism: proposed");
  await capturePanel(page, "paths-hearing");
  await last.getByRole("link").click();
  const reference = page.locator(`.connections-endpoint[data-endpoint-id="${pitch}"]`);
  await reference.locator("summary").first().click();
  await expect(reference.getByRole("region", { name: "Reference coordinate evidence" })).toBeVisible();
  await expect(page.locator(".connections-evidence")).toContainText("proposed");
  await expect(page.locator('[data-pair-role="source"] [data-pair-mark]')).toHaveCount(0);
});

test("path changes and link inspection survive interleaved back-forward and reload", async ({ page }) => {
  await ready(page, `?utm_source=paths&entity=${sound}`); await choose(page, sound, nerve);
  const initial = page.url();
  await page.getByRole("combobox", { name: "Path destination observation" }).selectOption(pitch);
  const changed = page.url();
  await panel(page).getByRole("link", { name: "Inspect path link 1 and evidence" }).click();
  const inspected = page.url();
  await page.reload(); await expect(app(page)).toHaveAttribute("data-ready", "true"); await expect(panel(page)).toHaveAttribute("data-path-to", pitch);
  expect(page.url()).toBe(inspected); expect(new URL(page.url()).searchParams.get("utm_source")).toBe("paths");
  await page.goBack(); await expect(page).toHaveURL(changed); await expect(app(page)).toHaveAttribute("data-edge-id", "");
  await page.goBack(); await expect(page).toHaveURL(initial); await expect(panel(page)).toHaveAttribute("data-path-to", nerve);
  await page.goForward(); await expect(panel(page)).toHaveAttribute("data-path-to", pitch);
  await page.goForward(); await expect(page).toHaveURL(inspected);
});

test("closing clears only path state and can be reversed through native history", async ({ page }) => {
  await ready(page, pathQuery(heart, tick, { path_kinds: "all", entity: heart, edge: numerical, utm_source: "test" }));
  await expect(panel(page)).toHaveAttribute("data-path-status", "found");
  const before = page.url(); await page.getByRole("button", { name: "Close path finder" }).click();
  await expect(panel(page)).toHaveCount(0); await expect(app(page)).toHaveAttribute("data-edge-id", numerical);
  expect(new URL(page.url()).searchParams.get("utm_source")).toBe("test");
  await page.goBack(); await expect(page).toHaveURL(before); await expect(panel(page)).toHaveAttribute("data-path-status", "found");
  await page.goForward(); await expect(panel(page)).toHaveCount(0);
});

test("path controls retain keyboard focus and repeated selections do not duplicate history", async ({ page }) => {
  await ready(page, pathQuery(quartz, tick)); await expect(panel(page)).toHaveAttribute("data-path-status", "found");
  const control = page.getByRole("combobox", { name: "Path traversal direction" });
  await control.focus(); await control.press("End"); await control.press("Enter");
  await expect(control).toHaveValue("either"); await expect(control).toBeFocused();
  const count = await page.evaluate(() => history.length); await control.selectOption("either");
  expect(await page.evaluate(() => history.length)).toBe(count);
  const choice = panel(page).getByRole("link", { name: "Inspect path link 1 and evidence" }); await choice.focus(); await choice.press("Enter");
  await expect(page.locator("#connections-selected-detail")).toBeFocused();
});

test("unknown endpoint IDs stay unselected and no-path states never invent or broaden links", async ({ page }) => {
  await ready(page, pathQuery("missing", tick, { path_direction: "random", path_kinds: "constructor" }));
  await expect(panel(page)).toHaveAttribute("data-path-status", "invalid");
  await expect(page.getByRole("combobox", { name: "Path start observation" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Path traversal direction" })).toHaveValue("forward");
  await expect(page.getByRole("combobox", { name: "Path link categories" })).toHaveValue("physical");
  await page.getByRole("combobox", { name: "Path start observation" }).selectOption("atomic.cesium-133.hyperfine-transition");
  await expect(panel(page)).toHaveAttribute("data-path-status", "not-found");
  await expect(panel(page)).toContainText("not proof that the observations are physically unrelated");
  await expect(panel(page).locator("[data-path-edge]")).toHaveCount(0);
});

test("path links carry complete independent endpoints for opening in a new page", async ({ page }) => {
  await ready(page, pathQuery(sound, nerve, { utm_source: "modified-link" }));
  await expect(panel(page)).toHaveAttribute("data-path-status", "found");
  const href = await panel(page).getByRole("link", { name: "Inspect path link 2 and evidence" }).getAttribute("href");
  const url = new URL(href!, page.url()); expect(url.hash).toBe("#connections-selected-detail");
  const other = await page.context().newPage(); await other.goto(url.href);
  await expect(app(other)).toHaveAttribute("data-ready", "true"); await expect(panel(other)).toHaveAttribute("data-path-from", sound);
  await expect(panel(other)).toHaveAttribute("data-path-to", nerve); await expect(app(other)).toHaveAttribute("data-entity-id", hair);
  expect(new URL(other.url()).searchParams.get("utm_source")).toBe("modified-link"); await other.close();
});

test("same endpoints are a zero-link selection and single-link filters cannot silently change path settings", async ({ page }) => {
  await ready(page, pathQuery(heart, heart, { entity: heart, kind: "numerical" }));
  await expect(panel(page)).toHaveAttribute("data-path-status", "same"); await expect(panel(page).locator("[data-path-edge]")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Path destination observation" }).selectOption(tick);
  await expect(panel(page)).toHaveAttribute("data-path-status", "not-found");
  await expect(page.locator(`[data-edge-choice="${numerical}"]`)).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Path link categories" })).toHaveValue("physical");
});

test.describe("touch recorded paths", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  test("native taps inspect paths and keep selectors, names and evidence actions contained", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" }); await ready(page, `?entity=${quartz}`);
    await page.getByRole("button", { name: "Find a recorded path", exact: true }).tap();
    await page.getByRole("combobox", { name: "Path destination observation" }).selectOption(tick);
    await expect(panel(page)).toHaveAttribute("data-path-status", "found");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const control of await panel(page).locator("select, a, button").all()) {
        const box = await control.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width); expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      const link = panel(page).getByRole("link", { name: "Inspect path link 1 and evidence" }); await link.tap();
      await expect(page.locator("#connections-selected-detail")).toBeFocused(); await expect(app(page)).toHaveAttribute("data-edge-id", await panel(page).locator("[data-path-edge]").getAttribute("data-path-edge") ?? "");
    }
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "artifacts/screenshots/paths-mobile.png", fullPage: true });
  });
  test("each inspected step exposes its heading below the sticky header on a narrow screen", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, pathQuery(electrical, sensor));
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (let i = 1; i <= 3; i++) {
        await panel(page).getByRole("link", { name: `Inspect path link ${i} and evidence` }).tap();
        await expect(page.locator("#connections-selected-detail")).toBeFocused();
        await expect.poll(async () => {
          const heading = await page.locator(".connections-meaning h2").boundingBox();
          const header = await page.locator(".site-header").boundingBox();
          return !!heading && !!header && heading.y >= header.y + header.height && heading.y + heading.height <= 844;
        }).toBe(true);
      }
    }
  });
});
