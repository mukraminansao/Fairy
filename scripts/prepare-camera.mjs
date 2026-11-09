import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);
const runtime = new URL(".camera-runtime/", root);
const wasm = new URL("node_modules/@mediapipe/tasks-vision/wasm/", root);
const model = new URL("face_landmarker.task", runtime);
const expected = "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";
const url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

await mkdir(new URL("wasm/", runtime), { recursive: true });
let weights = await readFile(model).catch((error) => {
  if (error.code === "ENOENT") return null;
  throw error;
});
if (!weights) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: "error" });
  if (!response.ok) throw new Error("Could not download the pinned MediaPipe model: HTTP " + response.status);
  weights = Buffer.from(await response.arrayBuffer());
}
if (sha(weights) !== expected) throw new Error("The MediaPipe model does not match the pinned SHA-256.");
await writeFile(model, weights);
for (const file of await readdir(wasm)) {
  if (/^vision_wasm.*\.(?:js|wasm)$/.test(file)) {
    await copyFile(new URL(file, wasm), new URL("wasm/" + file, runtime));
  }
}
await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ["src/app/studio/beauty/camera-tracker.worker.ts"],
  outfile: ".camera-runtime/tracker.js",
  bundle: true, minify: true, platform: "browser", format: "iife", target: "es2022", legalComments: "linked",
});
console.log("Prepared and verified the local FAIRY camera runtime.");

