"use client";

import { useId } from "react";
import { maxBrush, maxStrokes, minBrush, type ContourSketch } from "../../contour-sketch";
import styles from "./beauty-studio.module.css";

export function ContourTools({ sketch, size, drawing, onToggle, onSize, onChange }: {
  sketch: ContourSketch; size: number; drawing: boolean; onToggle: () => void; onSize: (size: number) => void;
  onChange: (update: (current: ContourSketch) => ContourSketch) => void;
}) {
  const id = useId();
  const hasPaint = sketch.strokes.length > 0;
  return <fieldset className={styles.contourControls}>
    <legend>Contour brush</legend>
    <div className={styles.brushActions}>
      <button type="button" aria-pressed={drawing} onClick={onToggle}>{drawing ? "Done drawing" : "Draw contour"}</button>
      <button type="button" disabled={!hasPaint} onClick={() => onChange((current) => ({ ...current, blend: 85 }))}>Blend contour</button>
      <button type="button" disabled={!hasPaint} onClick={() => onChange((current) => ({ ...current, strokes: current.strokes.slice(0, -1) }))}>Undo stroke</button>
      <button type="button" disabled={!hasPaint} onClick={() => onChange((current) => ({ ...current, strokes: [] }))}>Clear contour</button>
    </div>
    <div className={styles.brushSliders}>
      <label htmlFor={id + "-size"}>Brush size
        <input id={id + "-size"} type="range" min={minBrush} max={maxBrush} value={size}
          onChange={(event) => onSize(event.currentTarget.valueAsNumber)} />
      </label>
      <label htmlFor={id + "-blend"}>Blend amount <span aria-hidden="true">{sketch.blend}%</span>
        <input id={id + "-blend"} type="range" min={0} max={100} value={sketch.blend} disabled={!hasPaint}
          onChange={(event) => {
            const blend = event.currentTarget.valueAsNumber;
            onChange((current) => ({ ...current, blend }));
          }} />
      </label>
    </div>
    <p>{sketch.strokes.length >= maxStrokes ? "Undo or clear a stroke to keep drawing."
      : drawing ? "Drag or tap on the skin. Blend to soften the edges, then choose Done drawing to compare."
      : "Draw anywhere on the face, then blend to soften the edges."}</p>
  </fieldset>;
}
