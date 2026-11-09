import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { allowedCameraHost, cameraPreviewEnabled, cameraRuntimeDirectory } from "@/server/camera-preview";

const assets: Record<string, string> = {
  "tracker.js": "text/javascript; charset=utf-8",
  "face_landmarker.task": "application/octet-stream",
  "wasm/vision_wasm_internal.js": "text/javascript; charset=utf-8",
  "wasm/vision_wasm_internal.wasm": "application/wasm",
  "wasm/vision_wasm_module_internal.js": "text/javascript; charset=utf-8",
  "wasm/vision_wasm_module_internal.wasm": "application/wasm",
};

export async function GET(request: Request, { params }: { params: Promise<{ asset: string[] }> }) {
  if (!cameraPreviewEnabled() || !allowedCameraHost(request.headers.get("host"))) return new Response(null, { status: 404 });
  const asset = (await params).asset.join("/");
  if (!Object.hasOwn(assets, asset)) return new Response(null, { status: 404 });
  const filename = join(cameraRuntimeDirectory(), asset);
  try {
    const info = await stat(filename);
    if (!info.isFile()) return new Response(null, { status: 404 });
    return new Response(Readable.toWeb(createReadStream(filename)) as ReadableStream<Uint8Array>, {
      headers: { "Content-Type": assets[asset], "Content-Length": String(info.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

