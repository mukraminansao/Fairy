import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const connection = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!connection || !["localhost", "127.0.0.1", "[::1]"].includes(connection.hostname)) {
  throw new Error("Backend tests require an isolated local PostgreSQL connection.");
}
connection.pathname = "/fairy_test";
process.env.DATABASE_URL = connection.href;
process.env.AUTH_URL = "http://127.0.0.1:3107";
process.env.FAIRY_NEXT_DIST_DIR = ".next-backend";
if (!process.env.FAIRY_BACKEND_SESSION_READY) {
  process.env.AUTH_SECRET = randomBytes(32).toString("base64url");
  process.env.FAIRY_DEV_AUTH_PASSWORD = randomBytes(24).toString("base64url");
  process.env.FAIRY_BACKEND_SESSION_READY = "1";
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "backend.integration.ts",
  workers: 1,
  timeout: 60_000,
  outputDir: "./.backend-test-results",
  use: { baseURL: process.env.AUTH_URL, channel: "chrome", viewport: { width: 1672, height: 941 }, trace: "off" },
  webServer: {
    command: "npm run dev -- --port 3107",
    url: process.env.AUTH_URL,
    timeout: 90_000,
    reuseExistingServer: false,
  },
});

