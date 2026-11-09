"use client";

import { useEffect, useState, type RefObject } from "react";
import styles from "./scene-connector.module.css";

type Point = readonly [number, number];

type ConnectorProps = {
  layoutRef: RefObject<HTMLElement | null>;
  photoRef: RefObject<HTMLElement | null>;
  macroRef: RefObject<HTMLButtonElement | null>;
  itemId: string;
  anchor?: Point;
};

function rightEdge(path: SVGPathElement): Point {
  const length = path.getTotalLength();
  let rightmost = path.getPointAtLength(0);
  // Sample the silhouette so the line starts on the product, even for irregular shapes.
  for (let sample = 1; sample <= 80; sample += 1) {
    const point = path.getPointAtLength(length * sample / 80);
    if (point.x > rightmost.x) rightmost = point;
  }
  return [rightmost.x, rightmost.y];
}

export function SceneConnector({ layoutRef, photoRef, macroRef, itemId, anchor }: ConnectorProps) {
  const [line, setLine] = useState<{ path: string; endX: number; endY: number } | null>(null);

  useEffect(() => {
    const layout = layoutRef.current;
    const macro = macroRef.current;
    const outline = photoRef.current?.querySelector<SVGPathElement>('path[data-item="' + itemId + '"]');
    const overlay = outline?.ownerSVGElement;
    if (!layout || !macro || !outline || !overlay) return;

    const sourcePoint = new DOMPoint(...(anchor ?? rightEdge(outline)));
    const update = () => {
      const transform = outline.getScreenCTM();
      if (!transform) return;
      const root = layout.getBoundingClientRect();
      const target = macro.getBoundingClientRect();
      const source = sourcePoint.matrixTransform(transform);
      const startX = source.x - root.left;
      const startY = source.y - root.top;
      const endX = target.left - root.left;
      const endY = target.top - root.top + target.height * .52;
      const midX = (startX + endX) / 2;
      setLine({
        path: `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`,
        endX,
        endY,
      });
    };

    const observer = new ResizeObserver(update);
    [layout, overlay, macro].forEach((element) => observer.observe(element));
    update();
    return () => observer.disconnect();
  }, [anchor, itemId, layoutRef, macroRef, photoRef]);

  if (!line) return null;

  return (
    <svg className={styles.connector} data-connector-for={itemId} aria-hidden="true">
      <path className={styles.highlight} d={line.path} />
      <path d={line.path} />
      <circle cx={line.endX} cy={line.endY} r="2.5" />
    </svg>
  );
}

