export type TrackerRequest =
  | { type: "start"; mode: "VIDEO" | "IMAGE" }
  | { type: "frame"; image: ImageBitmap; timestamp?: number };
export type TrackerMessage =
  | { type: "ready" }
  | { type: "result"; points: Float32Array | null }
  | { type: "error" };

