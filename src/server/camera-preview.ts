import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function cameraRuntimeDirectory() {
  return join(process.cwd(), ".camera-runtime");
}

export function cameraPreviewEnabled() {
  return process.env.NODE_ENV === "development" && process.env.FAIRY_CAMERA_PREVIEW === "true" &&
    ["tracker.js", "face_landmarker.task"].every((asset) => existsSync(join(cameraRuntimeDirectory(), asset)));
}


export function allowedCameraHost(host: string | null) {
  if (!host || !/^(?:[a-z\d.-]+|\[[a-f\d:]+\])(?::\d{1,5})?$/i.test(host)) return false;
  try {
    const parsed = new URL("http://" + host);
    if (["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) return true;
    const configured = new URL(process.env.FAIRY_CAMERA_DEV_ORIGIN ?? "");
    return configured.protocol === "https:" && configured.host === parsed.host && !configured.username && !configured.password;
  } catch {
    return false;
  }
}
