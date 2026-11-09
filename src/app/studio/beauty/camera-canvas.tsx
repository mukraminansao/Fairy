"use client";

import { useEffect, useRef, useState } from "react";
import type { BeautyEffects } from "../../makeup-data";
import { drawMakeup } from "./camera-makeup";
import type { TrackerMessage, TrackerRequest } from "./camera-protocol";
import { PersonalStage } from "./personal-stage";
import styles from "./beauty-studio.module.css";

type Phase = "preparing" | "searching" | "tracking" | "no-tracking";
const guidance: Record<Phase, string> = {
  preparing: "Getting the live preview ready…",
  searching: "Finding your face… Face the camera in even light and bring your face into the center.",
  tracking: "Face in view. Change shades or intensity to see them live.",
  "no-tracking": "Camera connected. Makeup tracking couldn’t start here. Try a different browser or stop the camera and use a selfie.",
};
const playbackError = "The camera couldn’t start playing. Try another camera or close apps using it.";

function frameSize(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))] as const;
}

export function CameraCanvas({ stream, effects, showMakeup, onExit, onCapture }: {
  stream: MediaStream; effects: BeautyEffects; showMakeup: boolean; onExit: (message: string) => void; onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef({ effects, showMakeup, points: null as Float32Array | null });
  const [phase, setPhase] = useState<Phase>("preparing");
  const [captureStatus, setCaptureStatus] = useState("");
  const [capturing, setCapturing] = useState(false);
  const captureRequest = useRef(0);

  useEffect(() => () => { captureRequest.current++; }, [stream]);

  function takePhoto() {
    const video = videoRef.current;
    if (capturing || !video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    const token = ++captureRequest.current;
    const picture = document.createElement("canvas");
    const [width, height] = frameSize(video.videoWidth, video.videoHeight, 1400);
    picture.width = width; picture.height = height;
    const ctx = picture.getContext("2d");
    if (!ctx) { setCaptureStatus("This browser couldn’t capture a photo."); return; }
    setCapturing(true);
    setCaptureStatus("");
    // Match the live mirror but capture the original frame for before/after.
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    picture.toBlob((blob) => {
      picture.width = 1; picture.height = 1;
      if (token !== captureRequest.current) return;
      setCapturing(false);
      if (!blob) { setCaptureStatus("The photo couldn’t be taken. Try again."); return; }
      onCapture(new File([blob], "fairy-camera-photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", .94);
  }

  useEffect(() => {
    drawing.current.effects = effects;
    drawing.current.showMakeup = showMakeup;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawMakeup(ctx, drawing.current.points, effects, showMakeup);
  }, [effects, showMakeup]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const makeup = drawing.current;
    const captureSurface = document.createElement("canvas");
    const captureContext = captureSurface.getContext("2d");
    let worker: Worker | undefined;
    let stopped = false;
    let pending = false;
    let frame = 0;
    let timeout = 0;
    let lastSample = -Infinity;
    let lastFrame = -1;
    let useCanvasCapture = false;

    function stopTracking() {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      worker?.terminate();
      worker = undefined;
      makeup.points = null;
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    function trackerUnavailable() {
      if (stopped) return;
      stopTracking();
      setPhase("no-tracking");
    }
    function cleanUp() {
      stopped = true;
      stopTracking();
      stream.getTracks().forEach((track) => track.removeEventListener("ended", cameraEnded));
      if (video) { video.pause(); video.srcObject = null; }
    }
    function exit(message: string) {
      if (!stopped) { cleanUp(); onExit(message); }
    }
    function cameraEnded() { exit("The camera disconnected. The model preview is back."); }

    async function captureFrame(source: HTMLVideoElement) {
      const [width, height] = frameSize(source.videoWidth, source.videoHeight, 768);
      if (!useCanvasCapture) {
        try {
          return await createImageBitmap(source, { resizeWidth: width, resizeHeight: height });
        } catch {
          useCanvasCapture = true;
        }
      }
      if (!captureContext) throw new Error("Camera frame is unavailable");
      if (captureSurface.width !== width || captureSurface.height !== height) {
        captureSurface.width = width;
        captureSurface.height = height;
      }
      captureContext.drawImage(source, 0, 0, width, height);
      return createImageBitmap(captureSurface);
    }

    function schedule(now: number) {
      if (stopped || !video || !worker) return;
      frame = window.requestAnimationFrame(schedule);
      if (pending || now - lastSample < 60 || video.readyState < 2 || lastFrame === video.currentTime) return;
      lastSample = now;
      lastFrame = video.currentTime;
      pending = true;
      timeout = window.setTimeout(trackerUnavailable, 3500);
      void captureFrame(video).then((image) => {
        if (stopped || !worker) { image.close(); return; }
        try {
          const message: TrackerRequest = { type: "frame", image, timestamp: now };
          worker.postMessage(message, [image]);
        } catch {
          image.close();
          trackerUnavailable();
        }
      }).catch(trackerUnavailable);
    }

    async function start() {
      if (!video || !canvas || !ctx) throw new Error("Preview unavailable");
      stream.getVideoTracks().forEach((track) => track.addEventListener("ended", cameraEnded));
      video.muted = video.defaultMuted = true;
      video.srcObject = stream;
      timeout = window.setTimeout(() => exit(playbackError), 15000);
      await video.play();
      if (stopped) return;
      window.clearTimeout(timeout);
      if (!window.Worker || !window.createImageBitmap) { trackerUnavailable(); return; }
      timeout = window.setTimeout(trackerUnavailable, 25000);
      worker = new Worker("/camera-runtime/tracker.js", { name: "fairy-face-tracker" });
      worker.onerror = trackerUnavailable;
      worker.onmessageerror = trackerUnavailable;
      worker.onmessage = ({ data }: MessageEvent<TrackerMessage>) => {
        if (stopped || !worker) return;
        if (data.type === "error") { trackerUnavailable(); return; }
        window.clearTimeout(timeout);
        if (data.type === "ready") {
          setPhase("searching");
          frame = window.requestAnimationFrame(schedule);
          return;
        }
        pending = false;
        const [width, height] = frameSize(video.videoWidth, video.videoHeight, 960);
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        makeup.points = data.points;
        const tracked = drawMakeup(ctx, data.points, makeup.effects, makeup.showMakeup);
        setPhase(tracked ? "tracking" : "searching");
      };
      const message: TrackerRequest = { type: "start", mode: "VIDEO" };
      worker.postMessage(message);
    }

    queueMicrotask(() => {
      if (!stopped) void start().catch(() => {
        if (video && video.readyState >= 2) trackerUnavailable();
        else exit(playbackError);
      });
    });
    return cleanUp;
  }, [onExit, stream]);

  return (
    <>
      <PersonalStage mode="camera" phase={phase} compare={phase === "tracking" && showMakeup}>
        <video ref={videoRef} autoPlay muted playsInline aria-hidden="true" />
        <canvas ref={canvasRef} className={styles.personalMakeup} aria-hidden="true" />
        {(phase === "preparing" || phase === "searching") && <span className={styles.cameraGuide} aria-hidden="true" />}
      </PersonalStage>
      <p className={styles.cameraStatus} data-loading={phase === "preparing" || phase === "searching" || undefined}
        role="status">{captureStatus || guidance[phase]}</p>
      {phase !== "preparing" && <div className={styles.captureBar}>
        <button type="button" disabled={capturing} onClick={takePhoto}>{capturing ? "Taking photo…" : "Take photo"}</button>
        <span>The camera stops after the shot.</span>
      </div>}
    </>
  );
}

