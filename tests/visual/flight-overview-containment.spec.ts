import { expect, test } from "@playwright/test";

// These are DOM layout checks. They do not require or claim a successful 3D renderer.
test("overview shortcut icons and quantities stay in separate boxes at narrow and wide widths", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/atlas-spectra/flight/");
    await expect(page.locator(".flight-experience")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".flight-overview-shortcuts button")).toHaveCount(6);
    const boxes = await page.locator(".flight-overview-shortcuts button").evaluateAll((buttons) => buttons.map((button) => {
      const rect = (element: Element) => {
        const r = element.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      };
      return { icon: rect(button.querySelector("svg")!), slot: rect(button.querySelector(".phenomenon-symbol")!),
        quantity: rect(button.querySelector("small")!), button: rect(button) };
    }));
    for (const { icon, slot, quantity, button } of boxes) {
      expect(icon.left).toBeGreaterThanOrEqual(slot.left - 1);
      expect(icon.right).toBeLessThanOrEqual(slot.right + 1);
      expect(icon.top).toBeGreaterThanOrEqual(slot.top - 1);
      expect(icon.bottom).toBeLessThanOrEqual(slot.bottom + 1);
      expect(icon.right + 4).toBeLessThanOrEqual(quantity.left);
      expect(quantity.right).toBeLessThanOrEqual(button.right - 4);
      expect(button.left).toBeGreaterThanOrEqual(0);
      expect(button.right).toBeLessThanOrEqual(width);
    }
  }
});
