import { defineConfig, devices } from "@playwright/test";

// Browser tests: they click through the app in Chrome the way a visitor would.
// They run against the production build, so `npm run build` first (or use
// `npm run test:e2e`, which does both). The server gets its own database,
// reset to the sample data every run.
const PORT = 3150;

export default defineConfig({
  testDir: "e2e",
  // One server and one database, so one browser at a time.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The Chrome already installed here and on GitHub's runners, so there's no
    // separate browser to download.
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: {
    command: "npm run db:reset && npm run start",
    url: `http://localhost:${PORT}`,
    env: { PORT: String(PORT), PGLITE_DIR: ".data/e2e", DEMO_MODE: "true" },
    timeout: 60_000,
  },
});
