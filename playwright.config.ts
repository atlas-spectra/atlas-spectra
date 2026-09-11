import { defineConfig, devices } from "@playwright/test";

const flightBrowserTests = ["**/flight.spec.ts", "**/flight-review.spec.ts", "**/flight-orientation.spec.ts"];

export default defineConfig({
  testDir: "tests/visual",
  outputDir: "artifacts/playwright",
  fullyParallel: false,
  // Software WebGL competes for CPU with the 2D navigation stress test.
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4321", trace: "retain-on-failure" },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4321",
    url: "http://127.0.0.1:4321/atlas-spectra/",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    { name: "chromium", testIgnore: flightBrowserTests, use: { ...devices["Desktop Chrome"] } },
    {
      name: "chromium-flight", testMatch: flightBrowserTests,
      use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } },
    },
  ],
});
