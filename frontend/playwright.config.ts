import { defineConfig, devices } from "@playwright/test";
import "./e2e/helpers/env"; // eager-load env so config-time failures are clear

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared live DB — keep ordering deterministic
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  timeout: 90_000, // generous: API calls + cascade deletes traverse the SSH tunnel
  expect: { timeout: 15_000 },
  projects: [
    {
      // API-level flows (Playwright request context; no browser).
      name: "api",
      testMatch: /api\/.*\.spec\.ts/,
    },
    {
      // UI flows — mobile viewport (the app is a mobile-first PWA).
      name: "ui",
      testMatch: /ui\/.*\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium", // override device default (webkit) — we only install chromium
        baseURL: FRONTEND_URL,
        // Chromium with web security off so a localhost origin can call the
        // API without CORS friction during tests.
        launchOptions: { args: ["--disable-web-security"] },
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
      },
    },
  ],
});
