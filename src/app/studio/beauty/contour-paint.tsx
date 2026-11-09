"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { eyeContours, faceOval, outerLip } from "../../makeup-detail";
import { maxBrushPoints, maxStrokes, type BrushPoint, type ContourSketch, type ContourStroke } from "../../contour-sketch";
import styles from "./beauty-studio.module.css";

type Point = { x: number; y: number };
type Frame = { width: number; height: number; span: number; skin: string; anchor: BrushPoint };
export type BrushInput = { size: number; onStroke: (stroke: ContourStroke) => void };

export function contourFrame(width: number, height: number, at: (i: number) => Point): Frame {
  const left = at(234), right = at(454), nose = at(1);
  const span = Math.hypot(right.x - left.x, right.y - left.y);
  const polygon = (indices: readonly number[]) => "M" + indices.map((i) => {
    const { x, y } = at(i);
    return x.toFixed(2) + "," + y.toFixed(2);
  }).join("L") + "Z";
  return {
    width, height, span,
    skin: polygon(faceOval) + eyeContours.map(({ lid, lower }) => polygon([...lid, ...lower])).join("") + polygon(outerLip),
    anchor: [Math.round(nose.x / width * 1000), Math.round(nose.y / height * 1000)],
  };
}

function pathFor(points: BrushPoint[], frame: Frame) {
  const coords = points.map(([x, y]) => [x * frame.width / 1000, y * frame.height / 1000]);
  const [x, y] = coords[0];
  if (coords.length === 1) return "M" + x + "," + y + "l.01,0";
  let path = "M" + x + "," + y;
  for (let i = 1; i < coords.length - 1; i++) {
    const [px, py] = coords[i], [nx, ny] = coords[i + 1];
    path += "Q" + px + "," + py + " " + (px + nx) / 2 + "," + (py + ny) / 2;
  }
  return path + "L" + coords.at(-1)!.join(",");
}

export function ContourPaint({ frame, sketch, color, intensity, brush, view, comparisonClip }: {
  frame: Frame; sketch: ContourSketch; color: string; intensity: number; brush?: BrushInput; comparisonClip?: string;
  view: { x: number; y: number; width: number; height: number };
}) {
  const id = useId();
  const [draft, setDraft] = useState<ContourStroke>();
  const [cursor, setCursor] = useState<BrushPoint>();
  const [keyboardPaint, setKeyboardPaint] = useState(false);
  const pending = useRef<{ pointer: number; stroke: ContourStroke } | null>(null);
  const active = brush && sketch.strokes.length < maxStrokes;
  const strokes = draft && brush ? [...sketch.strokes, draft] : sketch.strokes;
  const blend = sketch.blend / 100;
  const bounds = {
    left: Math.max(0, Math.ceil(view.x / frame.width * 1000)),
    right: Math.min(1000, Math.floor((view.x + view.width) / frame.width * 1000)),
    top: Math.max(0, Math.ceil(view.y / frame.height * 1000)),
    bottom: Math.min(1000, Math.floor((view.y + view.height) / frame.height * 1000)),
  };
  const clamp = (x: number, y: number): BrushPoint => [
    Math.max(bounds.left, Math.min(bounds.right, Math.round(x))),
    Math.max(bounds.top, Math.min(bounds.bottom, Math.round(y))),
  ];
  const location = cursor ? clamp(...cursor) : clamp(...frame.anchor);
  function getPoint(event: PointerEvent<SVGRectElement>, withinFrame = false): BrushPoint | undefined {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (withinFrame && (x < view.x || y < view.y || x > view.x + view.width || y > view.y + view.height)) return;
    return clamp(x / frame.width * 1000, y / frame.height * 1000);
  }
  function extend(point: BrushPoint) {
    const current = pending.current;
    if (!current) return;
    const points = current.stroke.points;
    const [x, y] = points.at(-1)!;
    if (Math.hypot(point[0] - x, point[1] - y) < 3) return;
    const next = [...(points.length >= maxBrushPoints ? points.filter((_, i) => i % 2 === 0 || i === points.length - 1) : points), point];
    current.stroke = { ...current.stroke, points: next };
    setDraft(current.stroke);
  }
  function finish(commit: boolean) {
    const current = pending.current;
    pending.current = null;
    setDraft(undefined);
    setKeyboardPaint(false);
    if (commit && current && active && brush) brush.onStroke(current.stroke);
  }
  function onKey(event: KeyboardEvent<SVGRectElement>) {
    if (!active || !brush) return;
    const directions: Record<string, BrushPoint> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      const step = event.shiftKey ? 24 : 6;
      const point = clamp(location[0] + direction[0] * step, location[1] + direction[1] * step);
      setCursor(point);
      if (pending.current?.pointer === -1) extend(point);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (event.repeat) return;
      if (pending.current?.pointer === -1) finish(true);
      else if (!pending.current) {
        const stroke = { size: brush.size, points: [location] };
        pending.current = { pointer: -1, stroke };
        setDraft(stroke);
        setKeyboardPaint(true);
      }
    } else if (event.key === "Escape" && pending.current?.pointer === -1) {
      event.stopPropagation();
      finish(false);
    }
  }

  return <>
    {strokes.length > 0 && <g data-effect="contour" data-blend={sketch.blend} pointerEvents="none" clipPath={comparisonClip}
      style={{ mixBlendMode: "multiply" }} opacity={Math.min(.86, .62 * intensity) * (1 - .52 * blend)}>
      <defs>
        <clipPath id={id + "-skin"}><path d={frame.skin} clipRule="evenodd" /></clipPath>
        {strokes.map(({ size }, index) => <filter key={index} id={id + "-soft-" + index} filterUnits="userSpaceOnUse"
          x={0} y={0} width={frame.width} height={frame.height}>
          <feGaussianBlur stdDeviation={frame.span * size / 100 * (.09 + .62 * blend)} />
        </filter>)}
      </defs>
      <g clipPath={"url(#" + id + "-skin)"} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        {strokes.map(({ size, points }, index) => <path key={index} data-contour-stroke=""
          d={pathFor(points, frame)} strokeWidth={frame.span * size / 100 * (1 + .25 * blend)}
          filter={"url(#" + id + "-soft-" + index + ")"} />)}
      </g>
    </g>}
    {active && brush && <g className={styles.brushInteraction}>
      <desc id={id + "-help"}>Draw with a finger, pen or mouse. With a keyboard, move with arrow keys and press Space to start or finish a stroke.</desc>
      <rect {...view} fill="transparent" tabIndex={0} role="application" aria-label="Contour drawing surface"
        aria-describedby={id + "-help"}
        data-brush-input="" style={{ cursor: "crosshair" }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || pending.current) return;
          const point = getPoint(event, true);
          if (!point) return;
          event.preventDefault();
          const stroke = { size: brush.size, points: [point] };
          event.currentTarget.setPointerCapture(event.pointerId);
          pending.current = { pointer: event.pointerId, stroke };
          setDraft(stroke);
        }}
        onPointerMove={(event) => {
          if (pending.current?.pointer !== event.pointerId) return;
          const point = getPoint(event);
          if (point) extend(point);
        }}
        onPointerUp={(event) => {
          if (pending.current?.pointer !== event.pointerId) return;
          const point = getPoint(event);
          if (point) extend(point);
          finish(true);
        }}
        onPointerCancel={(event) => { if (pending.current?.pointer === event.pointerId) finish(false); }}
        onLostPointerCapture={(event) => { if (pending.current?.pointer === event.pointerId) finish(false); }}
        onKeyDown={onKey}
        onBlur={() => { if (pending.current?.pointer === -1) finish(true); }} />
      <circle cx={location[0] / 1000 * frame.width} cy={location[1] / 1000 * frame.height} r={frame.span * brush.size / 200}
        aria-hidden="true" data-brush-cursor="" fill={keyboardPaint ? "#fbf0e940" : "none"} stroke="#3a291d" strokeWidth="2"
        vectorEffect="non-scaling-stroke" pointerEvents="none" />
    </g>}
  </>;
}
