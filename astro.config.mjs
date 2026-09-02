import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://atlas-spectra.github.io",
  integrations: [react()],
  trailingSlash: "always",
});
