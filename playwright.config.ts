import { defineConfig, devices } from "@playwright/test";

/**
 * Default run: Chromium only. Opt into the NFR-8 browser-matrix passes with
 * PW_PLATFORM (one at a time, so `npx playwright test` never multiplies):
 *   $env:PW_PLATFORM="webkit"  npx playwright test   → Desktop Safari
 *   $env:PW_PLATFORM="mobile"  npx playwright test   → Pixel 7 (Android Chrome)
 * slow3g.spec.ts self-skips outside Chromium (CDP emulation).
 */
function projects() {
  if (process.env.PW_PLATFORM === "webkit") {
    return [{ name: "webkit", use: { ...devices["Desktop Safari"] } }];
  }
  if (process.env.PW_PLATFORM === "mobile") {
    return [{ name: "pixel7", use: { ...devices["Pixel 7"] } }];
  }
  return [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }];
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: projects(),
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
