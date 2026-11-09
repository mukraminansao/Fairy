import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    viewport: { width: 1672, height: 941 },
    deviceScaleFactor: 1,
    actionTimeout: 8_000,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 90_000,
  },
});
