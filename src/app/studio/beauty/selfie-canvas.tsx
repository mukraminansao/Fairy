"use client";

import { useEffect, useRef, useState } from "react";
import type { BeautyEffects } from "../../makeup-data";
import { emptyContour, maxStrokes } from "../../contour-sketch";
import { ContourPaint, contourFrame } from "./contour-paint";
import { ContourTools } from "./contour-tools";
import { drawMakeup } from "./camera-makeup";
import type { TrackerMessage, TrackerRequest } from "./camera-protocol";
import { PersonalStage } from "./personal-stage";
import styles from "./beauty-studio.module.css";

const maxBytes = 15 * 1024 * 1024;
type PhotoPhase = "loading" | "searching" | "ready" | "no-face" | "unsupported" | "too-big" | "unreadable" | "tracker-error";
const messages: Record<PhotoPhase, string> = {
  loading: "Opening your photo…",
  searching: "Finding a face in your photo…",
  ready: "Photo ready. Change shades or intensity to try another look.",
  "no-face": "No clear face found. Try a well-lit photo with one person facing forward.",
  unsupported: "Choose a JPG, PNG, or WebP photo.",
  "too-big": "Choose a photo smaller than 15 MB.",
  unreadable: "This photo couldn’t be opened. Try a different JPG, PNG, or WebP.",
  "tracker-error": "Makeup tracking couldn’t start for this photo. Try another photo or use the sample model.",
};

async function supportedPhoto(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...magic: number[]) => magic.every((byte, i) => bytes[i] === byte);
  return starts(255,216,255) || starts(137,80,78,71,13,10,26,10) ||
    (starts(82,73,70,70) && [87,69,66,80].every((byte, i) => bytes[8 + i] === byte));
}

export function SelfieCanvas({ file, effects, showMakeup, onShowMakeup, contourSelected }: {
  file: File; effects: BeautyEffects; showMakeup: boolean; onShowMakeup: () => void; contourSelected: boolean;
}) {
  const photo = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const current = useRef({ points: null as Float32Array | null, effects, showMakeup });
  const [phase, setPhase] = useState<PhotoPhase>("loading");
  const [frame, setFrame] = useState<ReturnType<typeof contourFrame>>();
  const [sketch, setSketch] = useState(emptyContour);
  const [size, setSize] = useState(7);
  const [drawingContour, setDrawingContour] = useState(false);
  const canDraw = contourSelected && Boolean(effects.contourColor) && phase === "ready";
  const drawing = canDraw && drawingContour && showMakeup;

  useEffect(() => {
    current.current.effects = effects;
    current.current.showMakeup = showMakeup;
    const context = overlay.current?.getContext("2d");
    if (context) drawMakeup(context, current.current.points, effects, showMakeup);
  }, [effects, showMakeup]);

  useEffect(() => {
    const drawing = current.current;
    const base = photo.current;
    const makeup = overlay.current;
    const baseContext = base?.getContext("2d");
    const makeupContext = makeup?.getContext("2d");
    let worker: Worker | undefined;
    let disposed = false;
    let timeout = 0;
    function finish(status: PhotoPhase) {
      if (disposed) return;
      clearTimeout(timeout);
      worker?.terminate();
      worker = undefined;
      setPhase(status);
    }

    async function renderPhoto() {
      if (file.size > maxBytes) { finish("too-big"); return; }
      if (!await supportedPhoto(file)) { finish("unsupported"); return; }
      if (disposed || !base || !makeup || !baseContext || !makeupContext) return;
      let image: ImageBitmap;
      try { image = await createImageBitmap(file, { imageOrientation: "from-image" }); }
      catch { finish("unreadable"); return; }
      try {
        if (disposed) return;
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        base.width = makeup.width = Math.max(1, Math.round(image.width * scale));
        base.height = makeup.height = Math.max(1, Math.round(image.height * scale));
        baseContext.drawImage(image, 0, 0, base.width, base.height);
      } finally { image.close(); }
      if (disposed) return;
      setPhase("searching");
      worker = new Worker("/camera-runtime/tracker.js", { name: "fairy-photo-tracker" });
      timeout = window.setTimeout(() => finish("tracker-error"), 25000);
      worker.onerror = () => finish("tracker-error");
      worker.onmessageerror = () => finish("tracker-error");
      worker.onmessage = ({ data }: MessageEvent<TrackerMessage>) => {
        if (disposed) return;
        if (data.type === "error") { finish("tracker-error"); return; }
        if (data.type === "result") {
          drawing.points = data.points;
          const found = drawMakeup(makeupContext, data.points, drawing.effects, drawing.showMakeup);
          const points = data.points;
          if (found && points) setFrame(contourFrame(base.width, base.height, (i) => ({
            x: points[i * 2] * base.width, y: points[i * 2 + 1] * base.height,
          })));
          finish(found ? "ready" : "no-face");
          return;
        }
        const scale = Math.min(1, 768 / Math.max(base.width, base.height));
        void createImageBitmap(base, {
          resizeWidth: Math.max(1, Math.round(base.width * scale)), resizeHeight: Math.max(1, Math.round(base.height * scale)), resizeQuality: "high",
        }).then((image) => {
          if (disposed || !worker) { image.close(); return; }
          try {
            const message: TrackerRequest = { type: "frame", image };
            worker.postMessage(message, [image]);
          } catch {
            image.close();
            finish("tracker-error");
          }
        }).catch(() => finish("tracker-error"));
      };
      const message: TrackerRequest = { type: "start", mode: "IMAGE" };
      worker.postMessage(message);
    }

    void renderPhoto().catch(() => finish("tracker-error"));
    return () => {
      disposed = true;
      clearTimeout(timeout);
      worker?.terminate();
      drawing.points = null;
      if (base && baseContext) baseContext.clearRect(0, 0, base.width, base.height);
      if (makeup && makeupContext) makeupContext.clearRect(0, 0, makeup.width, makeup.height);
    };
  }, [file]);

  return <>
    {canDraw && <ContourTools sketch={sketch} size={size} drawing={drawing} onSize={setSize} onChange={setSketch}
      onToggle={() => { if (!drawing) onShowMakeup(); setDrawingContour(!drawing); }} />}
    <PersonalStage mode="selfie" phase={phase} compare={phase === "ready" && showMakeup && !drawing}>
      <canvas ref={photo} role="img" aria-label="Your selfie" />
      <canvas ref={overlay} className={styles.personalMakeup} aria-hidden="true" />
      {frame && effects.contourColor && showMakeup && (drawing || sketch.strokes.length > 0) &&
        <svg className={styles.personalMakeup + " " + styles.photoContour} data-drawing={drawing || undefined}
          viewBox={`0 0 ${frame.width} ${frame.height}`} aria-hidden={drawing ? undefined : true}>
          <ContourPaint frame={frame} sketch={sketch} color={effects.contourColor} intensity={effects.strength?.contourColor ?? 1}
            view={{ x: 0, y: 0, width: frame.width, height: frame.height }}
            brush={drawing ? { size, onStroke: (stroke) => setSketch((current) => current.strokes.length < maxStrokes
              ? { ...current, strokes: [...current.strokes, stroke] } : current) } : undefined} />
        </svg>}
    </PersonalStage>
    <p className={styles.cameraStatus} data-loading={phase === "loading" || phase === "searching" || undefined}
      role="status">{messages[phase]}</p>
    {canDraw && <p className={styles.brushPrivacy}>Contour drawn on this photo is cleared when you remove or replace it.</p>}
  </>;
}

