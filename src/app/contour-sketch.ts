export type BrushPoint = [x: number, y: number];
export type ContourStroke = { size: number; points: BrushPoint[] };
export type ContourSketch = { blend: number; strokes: ContourStroke[] };

export const maxStrokes = 24;
export const maxBrushPoints = 160;
export const minBrush = 3;
export const maxBrush = 16;
export const emptyContour: ContourSketch = { blend: 0, strokes: [] };

export function readContourSketch(value: unknown): ContourSketch | undefined {
  if (!value || typeof value !== "object" || !("blend" in value) || !("strokes" in value)) return;
  const { blend, strokes } = value;
  const bounded = (n: unknown, min: number, max: number) =>
    typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
  if (typeof blend !== "number" || !bounded(blend, 0, 100) || !Array.isArray(strokes) || strokes.length > maxStrokes) return;
  for (const stroke of strokes) {
    if (!stroke || !bounded(stroke.size, minBrush, maxBrush) || !Array.isArray(stroke.points) ||
      !stroke.points.length || stroke.points.length > maxBrushPoints ||
      !stroke.points.every((point: unknown) => Array.isArray(point) && point.length === 2 &&
        point.every((n) => bounded(n, 0, 1000)))) return;
  }
  return { blend, strokes };
}
