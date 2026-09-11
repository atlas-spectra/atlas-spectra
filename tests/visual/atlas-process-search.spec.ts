import { expect, test } from "@playwright/test";

const route = "/atlas-spectra/explore/";

test("the visible process name is searchable without bypassing domain focus", async ({ page }) => {
  await page.goto(`${route}?center=0.111&span=1.2`);
  const shell = page.locator(".atlas-workspace");
  await expect(shell).toHaveAttribute("data-ready", "true");
  const search = page.getByLabel("Find a phenomenon", { exact: true });
  const domains = page.getByRole("group", { name: "Domain focus", exact: true });
  const results = page.getByRole("region", { name: "Search results", exact: true });
  await search.fill("  HEART ACTIVITY  ");
  await expect(results.getByRole("button")).toHaveCount(3);
  await expect(page.locator('.plot-label[data-group-id="heart-activity"]')).toHaveCount(1);
  await domains.getByRole("button", { name: "Optical", exact: true }).click();
  await expect(results.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Fit results", exact: true })).toBeDisabled();
  await domains.getByRole("button", { name: "Biological", exact: true }).click();
  await expect(results.getByRole("button")).toHaveCount(3);
  await search.fill("");
  await page.getByRole("button", { name: "Fit results", exact: true }).click();
  const view = await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan]);
  const group = page.locator('.plot-label[data-group-id="heart-activity"]');
  await group.click();
  await page.getByRole("region", { name: "Heart activity observations", exact: true }).getByRole("button", { name: "Collapse observations", exact: true }).click();
  await expect(shell).toHaveAttribute("data-lane", "Biological");
  await expect(page.locator(".plot-label")).toHaveCount(1);
  await expect(group).toBeFocused();
  expect(await shell.evaluate((el: HTMLElement) => [el.dataset.viewCenter, el.dataset.viewSpan])).toEqual(view);
  await expect.poll(() => new URL(page.url()).searchParams.get("lane")).toBe("Biological");
  await page.reload();
  await expect(shell).toHaveAttribute("data-ready", "true");
  await expect(shell).toHaveAttribute("data-lane", "Biological");
  await expect(group).toHaveCount(1);
});
