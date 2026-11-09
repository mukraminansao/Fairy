export type EyePoint = { x: number; y: number };

export type EyeShadowBand = {
  outer: EyePoint;
  inner: EyePoint;
  wash: string; base: string;
  fence: string;
  feather: number;
};

export const eyeShadowStops = [
  [0, 0], [.065, .64], [.28, 1], [.56, .90], [.83, .73], [.95, .42], [1, 0],
] as const;

export function eyeShadowOpacity(strength = 1) {
  return Math.max(0, Math.min(.8, strength <= 1 ? .54 * strength : .54 + .17 * (strength - 1)));
}

const mix = (a: EyePoint, b: EyePoint, ratio: number) => ({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio });
const coord = ({ x, y }: EyePoint) => x.toFixed(2) + " " + y.toFixed(2);

function curve(points: readonly EyePoint[]) {
  let result = "";
  for (let i = 1; i < points.length - 1; i++) {
    result += " Q" + coord(points[i]) + " " + coord(mix(points[i], points[i + 1], .5));
  }
  return result + " L" + coord(points[points.length - 1]);
}

function ribbon(a: EyePoint[], b: EyePoint[]) {
  const reversed = [...b].reverse();
  return "M" + coord(a[0]) + curve(a) + " L" + coord(reversed[0]) + curve(reversed) + " Z";
}

export function createEyeShadowBand(lid: readonly EyePoint[], brow: readonly EyePoint[], outerAtStart: boolean): EyeShadowBand | null {
  const start = lid[0];
  const end = lid[lid.length - 1];
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (!Number.isFinite(length) || length < 4) return null;
  const dx = (end.x - start.x) / length;
  const dy = (end.y - start.y) / length;
  const along = (point: EyePoint) => (point.x - start.x) * dx + (point.y - start.y) * dy;
  const browPoints = brow.map((point) => ({ point, distance: along(point) })).sort((a, b) => a.distance - b.distance);

  const extend = (point: EyePoint, alongEye: number) => ({
    x: point.x + length * (dx * alongEye + dy * .023),
    y: point.y + length * (dy * alongEye - dx * .023),
  });
  const startEdge = extend(start, outerAtStart ? -.068 : -.035);
  const endEdge = extend(end, outerAtStart ? .035 : .068);
  const rows = [startEdge, ...lid, endEdge].map((point, index) => {
    const beyondCorner = index === 0 || index === lid.length + 1;
    const distance = along(point);
    const next = browPoints.findIndex((entry) => entry.distance >= distance);
    const above = next === 0 ? browPoints[0].point : next < 0 ? browPoints[browPoints.length - 1].point :
      mix(browPoints[next - 1].point, browPoints[next].point, (distance - browPoints[next - 1].distance) /
        Math.max(.01, browPoints[next].distance - browPoints[next - 1].distance));
    const gap = (above.x - point.x) * dy - (above.y - point.y) * dx;
    const rise = Math.max(0, Math.min(length * .85, gap));
    const t = Math.max(0, Math.min(1, distance / length));
    const taper = Math.sin(t * Math.PI) ** .65;
    const offset = (ratio: number) => ({ x: point.x + dy * rise * ratio, y: point.y - dx * rise * ratio });
    return {
      gap: rise,
      bottom: offset(.18 + .025 * taper),
      top: offset(.265 + .33 * taper),
      baseTop: offset((beyondCorner ? .06 : .165) + .335 * taper),
      safeBottom: offset(.009 + .009 * taper),
      safeTop: offset(.78),
    };
  });
  if (rows[Math.floor(rows.length / 2)].gap < length * .14) return null;
  return {
    outer: outerAtStart ? startEdge : endEdge,
    inner: outerAtStart ? endEdge : startEdge,
    wash: ribbon(rows.map(({ bottom }) => bottom), rows.map(({ top }) => top)),
    base: ribbon(rows.map(({ safeBottom }) => safeBottom), rows.map(({ baseTop }) => baseTop)),
    fence: ribbon(rows.map(({ safeBottom }) => safeBottom), rows.map(({ safeTop }) => safeTop)),
    feather: Math.max(.65, length * .042),
  };
}

