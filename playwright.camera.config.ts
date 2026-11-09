import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const feed = resolve(".camera-test-fixtures/face.y4m");
if (!existsSync(feed)) throw new Error("Run python scripts/camera-test-feed.py before camera tests.");
if (!existsSync(".camera-runtime/tracker.js")) throw new Error("Run npm run camera:setup before camera tests.");

const edge = process.env.FAIRY_TEST_BROWSER === "msedge";
const port = edge ? 3110 : 3108;
const origin = "http://127.0.0.1:" + port;
export default defineConfig({
  testDir: "./tests",
  testMatch: "camera.integration.ts",
  timeout: 75_000,
  workers: 1,
  outputDir: edge ? ".camera-test-results-edge" : ".camera-test-results",
  use: {
    baseURL: origin,
    channel: process.env.FAIRY_TEST_BROWSER ?? "chrome",
    viewport: { width: 1672, height: 941 },
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-file-for-fake-video-capture=" + feed] },
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --port " + port,
    url: origin,
    timeout: 90_000,
    reuseExistingServer: false,
    env: { FAIRY_CAMERA_PREVIEW: "true", FAIRY_NEXT_DIST_DIR: edge ? ".next-camera-edge" : ".next-camera", AUTH_URL: origin },
  },
});

