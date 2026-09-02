import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://atlas-spectra.github.io",
  base: "/atlas-spectra",
  integrations: [react()],
  trailingSlash: "always",
});
