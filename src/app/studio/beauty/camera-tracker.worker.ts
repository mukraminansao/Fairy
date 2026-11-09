import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { TrackerMessage, TrackerRequest } from "./camera-protocol";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<TrackerRequest>) => void) | null;
  postMessage(message: TrackerMessage, transfer?: Transferable[]): void;
};
let tracker: FaceLandmarker | undefined;

scope.onmessage = async ({ data }) => {
  if (data.type === "start") {
    try {
      const runtime = await FilesetResolver.forVisionTasks("/camera-runtime/wasm");
      tracker = await FaceLandmarker.createFromOptions(runtime, {
        baseOptions: { modelAssetPath: "/camera-runtime/face_landmarker.task", delegate: "CPU" },
        runningMode: data.mode,
        numFaces: 1,
        minFaceDetectionConfidence: .65,
        minFacePresenceConfidence: .65,
        minTrackingConfidence: .65,
      });
      scope.postMessage({ type: "ready" });
    } catch {
      scope.postMessage({ type: "error" });
    }
    return;
  }

  try {
    const result = data.timestamp === undefined ? tracker?.detect(data.image) : tracker?.detectForVideo(data.image, data.timestamp);
    const face = result?.faceLandmarks[0];
    if (!face) {
      scope.postMessage({ type: "result", points: null });
      return;
    }
    const points = new Float32Array(face.length * 2);
    for (let i = 0; i < face.length; i++) {
      points[2 * i] = face[i].x;
      points[2 * i + 1] = face[i].y;
    }
    scope.postMessage({ type: "result", points }, [points.buffer]);
  } catch {
    scope.postMessage({ type: "error" });
  } finally {
    data.image.close();
  }
};

