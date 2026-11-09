import type { EyePoint as Point } from "./eye-shadow";

export const faceOval = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109] as const;
export const eyeContours = [
  { lid: [33,246,161,160,159,158,157,173,133], lower: [155,154,153,145,144,163,7], brow: [46,53,52,65,55], browTop: [70,63,105,66,107], outerAtStart: true },
  { lid: [362,398,384,385,386,387,388,466,263], lower: [249,390,373,374,380,381,382], brow: [285,295,282,283,276], browTop: [336,296,334,293,300], outerAtStart: false },
] as const;
export const outerLip = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146] as const;
const innerLip = [78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95] as const;
export const mixPoint = (a: Point, b: Point, t = .5): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const coordinates = ({ x, y }: Point) => x.toFixed(2) + " " + y.toFixed(2);
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function smoothLoop(points: Point[]) {
  return "M" + coordinates(mixPoint(points[points.length - 1], points[0])) + points.map((point, i) =>
    " Q" + coordinates(point) + " " + coordinates(mixPoint(point, points[(i + 1) % points.length]))).join("") + " Z";
}

export function lipShape(at: (index: number) => Point) {
  const width = distance(at(61), at(291));
  const opening = distance(at(13), at(14));
  const top = at(13), bottom = at(14), center = mixPoint(top, bottom);
  const outer = smoothLoop(outerLip.map(at));
  if (opening < width * .025) return outer;
  // Leave teeth and mouth interior clear; extend pigment to the actual inner edge.
  const hole = innerLip.map(at).map((point) => mixPoint(point, center, .055));
  return outer + " " + smoothLoop(hole);
}

export function faceDetails(at: (index: number) => Point) {
  const eyes = eyeContours.map((eye) => {
    const lid = eye.lid.map(at);
    const width = distance(lid[0], lid[lid.length - 1]);
    const ux = (lid[lid.length - 1].x - lid[0].x) / Math.max(1, width);
    const uy = (lid[lid.length - 1].y - lid[0].y) / Math.max(1, width);
    const outer = eye.outerAtStart ? -1 : 1;
    const arch = eye.browTop.map(at);
    const below = eye.brow.map(at);
    const brow = smoothLoop([...arch, ...[...below].reverse()]);
    const lashLine = "M" + coordinates(lid[0]) + lid.slice(1, -1).map((point, i) =>
      " Q" + coordinates(point) + " " + coordinates(mixPoint(point, lid[i + 2]))).join("") + " L" + coordinates(lid[lid.length - 1]);
    const lashes = lid.slice(1,-1).map((start, i) => {
      const t = (i + 1) / (lid.length - 1);
      const towardOuter = eye.outerAtStart ? 1 - t : t;
      const height = width * (.035 + .052 * Math.sin(t * Math.PI) + .024 * towardOuter);
      const lean = height * (.25 + .36 * towardOuter) * outer;
      const end = { x: start.x + ux * lean + uy * height, y: start.y + uy * lean - ux * height };
      const control = { x: start.x + uy * height * .78, y: start.y - ux * height * .78 };
      return "M" + coordinates(start) + " Q" + coordinates(control) + " " + coordinates(end);
    }).join(" ");
    return { brow, lashes, lashLine, lashWidth: Math.max(.55, width * .011), linerWidth: Math.max(.7, width * .017) };
  });
  return { eyes };
}

