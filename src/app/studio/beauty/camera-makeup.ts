import type { BeautyEffects } from "../../makeup-data";
import { eyeContours as eyes, faceDetails, faceOval, lipShape, outerLip } from "../../makeup-detail";

import { createEyeShadowBand, eyeShadowOpacity, eyeShadowStops, type EyePoint as Point } from "../../eye-shadow";

const midpoint = (a: Point, b: Point, t = .5): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const limit = (value: number, max: number) => Math.max(0, Math.min(max, value));

function polygon(path: Path2D, points: Point[]) {
  path.moveTo(points[0].x, points[0].y);
  for (const { x, y } of points.slice(1)) path.lineTo(x, y);
  path.closePath();
}

export function drawMakeup(
  ctx: CanvasRenderingContext2D, marks: Float32Array | null, effects: BeautyEffects, visible: boolean,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!marks || marks.length < 936) return false;

  const at = (index: number): Point => ({ x: marks[index * 2] * width, y: marks[index * 2 + 1] * height });
  const nose = at(1);
  const left = at(234);
  const right = at(454);
  const span = distance(left, right);
  const tilt = Math.atan2(right.y - left.y, right.x - left.x);
  const yaw = Math.min(distance(nose, left), distance(nose, right)) / Math.max(distance(nose, left), distance(nose, right));
  if (!(span > width * .16 && yaw > .38 && nose.x > width * .14 && nose.x < width * .86 && nose.y > height * .12 && nose.y < height * .9)) return false;
  if (!visible) return true;

  const { strength } = effects;
  const details = effects.browColor || effects.lashColor || effects.linerColor ? faceDetails(at) : null;
  const skinOutline = new Path2D();
  polygon(skinOutline, faceOval.map(at));
  for (const eye of eyes) polygon(skinOutline, [...eye.lid, ...eye.lower].map(at));
  polygon(skinOutline, outerLip.map(at));
  ctx.save();
  ctx.clip(skinOutline, "evenodd");
  if (effects.skinColor) {
    const tint = ctx.createRadialGradient(nose.x, nose.y, span * .05, nose.x, nose.y, span * .57);
    tint.addColorStop(0, effects.skinColor);
    tint.addColorStop(1, effects.skinColor + "00");
    ctx.globalAlpha = limit((strength?.skinColor ?? 1) * .16, .33);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, width, height);
  }
  if (effects.blushColor) {
    ctx.globalAlpha = limit((strength?.blushColor ?? 1) * .35, .65);
    for (const [cheek, outer] of [[50, 116], [280, 345]]) {
      const center = midpoint(at(cheek), at(outer), .26);
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(tilt);
      ctx.scale(span * .21, span * .135);
      const color = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      color.addColorStop(0, effects.blushColor);
      color.addColorStop(.48, effects.blushColor + "8c");
      color.addColorStop(1, effects.blushColor + "00");
      ctx.fillStyle = color;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
  }
  ctx.restore();

  if (effects.shadowColor) {
    for (const eye of eyes) {
      const band = createEyeShadowBand(eye.lid.map(at), eye.brow.map(at), eye.outerAtStart);
      if (!band) continue;
      const pigment = ctx.createLinearGradient(band.outer.x, band.outer.y, band.inner.x, band.inner.y);
      for (const [offset, alpha] of eyeShadowStops) {
        pigment.addColorStop(offset, effects.shadowColor + Math.round(alpha * 255).toString(16).padStart(2, "0"));
      }
      ctx.save();
      ctx.clip(new Path2D(band.fence));
      const amount = eyeShadowOpacity(strength?.shadowColor);
      ctx.fillStyle = pigment;
      ctx.filter = "blur(" + band.feather * .45 + "px)";
      ctx.globalAlpha = amount * .72;
      ctx.fill(new Path2D(band.base));
      ctx.filter = "blur(" + band.feather + "px)";
      ctx.globalAlpha = amount * .84;
      ctx.fill(new Path2D(band.wash));
      ctx.restore();
    }
  }

  for (const eye of details?.eyes ?? []) {
    ctx.save();
    if (effects.browColor) {
      ctx.globalAlpha = limit((strength?.browColor ?? 1) * .3, .65);
      ctx.filter = "blur(" + Math.max(.35, span * .002) + "px)";
      ctx.fillStyle = effects.browColor;
      ctx.fill(new Path2D(eye.brow));
      ctx.filter = "none";
    }
    ctx.lineCap = "round";
    if (effects.linerColor) {
      ctx.strokeStyle = effects.linerColor;
      ctx.globalAlpha = limit((strength?.linerColor ?? 1) * .62, .88);
      ctx.lineWidth = eye.linerWidth;
      ctx.stroke(new Path2D(eye.lashLine));
    }
    if (effects.lashColor) {
      ctx.strokeStyle = effects.lashColor;
      ctx.globalAlpha = limit((strength?.lashColor ?? 1) * .68, .9);
      ctx.lineWidth = eye.lashWidth;
      ctx.stroke(new Path2D(eye.lashes));
    }
    ctx.restore();
  }

  if (effects.lipColor) {
    const lips = new Path2D(lipShape(at));
    const lipStrength = strength?.lipColor ?? 1;
    const finish = effects.lipFinish ?? "Satin";
    ctx.save();
    ctx.clip(lips, "evenodd");
    ctx.globalAlpha = limit(lipStrength * (finish === "Matte" ? .66 : finish === "Gloss" ? .42 : .52), .85);
    ctx.fillStyle = effects.lipColor;
    ctx.fill(lips, "evenodd");
    if (finish !== "Matte") {
      const start = midpoint(at(84), at(87));
      const end = midpoint(at(314), at(317));
      const center = midpoint(at(17), at(14));
      ctx.globalAlpha = limit(lipStrength * (finish === "Gloss" ? .44 : .16), .58);
      ctx.lineWidth = Math.max(1.1, span * .012);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#ffece6";
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(center.x, center.y + span * .006, end.x, end.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  return true;
}

