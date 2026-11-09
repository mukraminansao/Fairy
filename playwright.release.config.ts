import { defineConfig } from "@playwright/test";

let database: URL | undefined;
try { database = new URL(process.env.FAIRY_RELEASE_DATABASE_URL ?? ""); } catch { /* handled below */ }
if (!database || !["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) ||
    !/^\/fairy_test_release[a-f0-9]{10}$/.test(database.pathname)) {
  throw new Error("Create an isolated fixture database with npm run release:rehearse.");
}
const origin = "http://127.0.0.1:3116";

export default defineConfig({
  testDir: "./tests",
  testMatch: "release.integration.ts",
  workers: 1,
  timeout: 60_000,
  outputDir: ".release-test-results",
  use: { baseURL: origin, channel: "chrome", viewport: { width: 1672, height: 941 }, trace: "retain-on-failure" },
  webServer: {
    command: "npm run start -- --port 3116",
    url: origin,
    timeout: 60_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "production", DATABASE_URL: database.href, FAIRY_NEXT_DIST_DIR: ".next-release",
      AUTH_URL: origin, AUTH_OIDC_ISSUER: "", AUTH_OIDC_CLIENT_ID: "", AUTH_OIDC_CLIENT_SECRET: "",
      FAIRY_CAMERA_PREVIEW: "true",
    },
  },
});

