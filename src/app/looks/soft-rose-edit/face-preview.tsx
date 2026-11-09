"use client";

import { useId, useState } from "react";
import face from "../../../../data/face-regions.json";
import sampleLandmarks from "../../../../data/sample-face-landmarks.json";
import { emptyContour } from "../../contour-sketch";
import { eyeContours, faceDetails, lipShape } from "../../makeup-detail";
import { createEyeShadowBand, eyeShadowOpacity, eyeShadowStops } from "../../eye-shadow";
import type { BeautyEffects } from "../../makeup-data";
import { ContourPaint, contourFrame, type BrushInput } from "../../studio/beauty/contour-paint";
import styles from "./makeup.module.css";

const samplePoint = (index: number) => ({
  x: sampleLandmarks[index * 2] * face.imageSize[0],
  y: sampleLandmarks[index * 2 + 1] * face.imageSize[1],
});
const lips = lipShape(samplePoint);
const sampleDetails = faceDetails(samplePoint);
const sampleContour = contourFrame(...face.imageSize as [number, number], samplePoint);
const sampleBands = eyeContours.flatMap(({ lid, brow, outerAtStart }) => {
  const band = createEyeShadowBand(lid.map(samplePoint), brow.map(samplePoint), outerAtStart);
  return band ? [band] : [];
});

export const modelTones = ["light", "medium", "deep"] as const;
export type ModelTone = (typeof modelTones)[number];

export function FacePreview({
  lipColor, blushColor, shadowColor, skinColor, browColor, lashColor, contourColor, contourSketch, linerColor, strength,
  lipFinish = "Satin", studio = false, compare = true, zoom = 100, brush, modelTone = "medium", shadePreview = false, portrait = false, previewOrigin = false,
}: BeautyEffects & { studio?: boolean; compare?: boolean; zoom?: number; brush?: BrushInput; modelTone?: ModelTone; shadePreview?: boolean; portrait?: boolean; previewOrigin?: boolean }) {
  const id = useId();
  const [position, setPosition] = useState(50);
  const width = 1122 * 100 / zoom;
  const fullFace = studio && Boolean(brush || (contourColor && contourSketch?.strokes.length));
  const baseHeight = portrait ? face.imageSize[1] : fullFace ? 1010 : studio ? 814 : 790;
  const height = baseHeight * 100 / zoom;
  const x = (1122 - width) / 2;
  const y = (portrait ? 0 : fullFace ? 264 : studio ? 419 : 417) + (baseHeight - height) / 2;
  const lipStrength = strength?.lipColor ?? 1;
  const shadowOpacity = eyeShadowOpacity(strength?.shadowColor);
  const after = "url(#" + id + "-after)";
  return (
    <div className={styles.face} data-studio={studio || undefined} data-full-face={fullFace || undefined}
      data-portrait={portrait || undefined} data-preview-origin={previewOrigin || undefined}>
      <svg viewBox={`${x} ${y} ${width} ${height}`} aria-hidden={brush ? undefined : true}
        style={brush ? { touchAction: "none" } : undefined}>
        <defs>
          <clipPath id={id + "-after"}><rect x={x + width * (compare ? position : 0) / 100} y={y} width={width} height={height} /></clipPath>
          <filter id={id + "-lips"}><feGaussianBlur stdDeviation="3" /></filter>
          <filter id={id + "-brows"}><feGaussianBlur stdDeviation="1.2" /></filter>
          {shadowColor && sampleBands.map((band, index) => {
            const key = id + "-eye-" + index;
            return <g key={key}>
              <clipPath id={key + "-fence"}><path d={band.fence} /></clipPath>
              <filter id={key + "-base-blur"} x="-25%" y="-100%" width="150%" height="300%">
                <feGaussianBlur stdDeviation={band.feather * .45} />
              </filter>
              <filter id={key + "-blur"} x="-25%" y="-100%" width="150%" height="300%">
                <feGaussianBlur stdDeviation={band.feather} />
              </filter>
              <linearGradient data-eye-pigment="" id={key + "-pigment"} gradientUnits="userSpaceOnUse"
                x1={band.outer.x} y1={band.outer.y} x2={band.inner.x} y2={band.inner.y}>
                {eyeShadowStops.map(([offset, alpha]) => <stop key={offset} offset={offset} stopColor={shadowColor} stopOpacity={alpha} />)}
              </linearGradient>
            </g>;
          })}
          <filter id={id + "-skin"}><feGaussianBlur stdDeviation="23" /></filter>
          <radialGradient id={id + "-blush"}>
            <stop stopColor={blushColor} stopOpacity={Math.min(.72, .32 * (strength?.blushColor ?? 1))} />
            <stop offset="1" stopColor={blushColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        <image href={studio ? "/assets/images/studio-sample-" + modelTone + ".webp" : face.asset} width={face.imageSize[0]} height={face.imageSize[1]} />
        {studio && skinColor && (
          <g clipPath={after}>
            <path data-effect="skin" fill={skinColor} fillRule="evenodd" filter={"url(#" + id + "-skin)"}
              opacity={Math.min(.35, .12 * (strength?.skinColor ?? 1))}
              d="M276 538Q307 485 382 490Q479 514 510 468L499 415Q565 393 641 412L625 470Q636 510 710 494Q817 470 858 547L895 703Q928 819 882 949Q790 1194 565 1203Q343 1195 235 949Q183 837 231 701Z M255 622Q309 540 383 547Q450 552 478 632Q407 682 351 682Q283 671 255 622Z M647 627Q675 555 751 548Q818 550 868 620Q825 678 748 680Q686 677 647 627Z M391 995Q411 922 560 906Q697 914 739 992Q699 1072 567 1097Q443 1083 391 995Z" />
          </g>
        )}
        <g clipPath={after} style={{ mixBlendMode: "multiply" }}>
          {blushColor && (
            <g data-effect="cheeks" fill={"url(#" + id + "-blush)"}>
              <ellipse cx="340" cy="807" rx="168" ry="112" />
              <ellipse cx="795" cy="801" rx="168" ry="112" />
            </g>
          )}
          {lipColor && <path data-effect="lips" data-finish={lipFinish} d={lips}
            fill={lipColor} fillRule="evenodd"
            opacity={Math.min(.88, (lipFinish === "Matte" ? .66 : lipFinish === "Gloss" ? .42 : .53) * lipStrength)} />}
        </g>
        {lipColor && lipFinish === "Gloss" && (
          <g clipPath={after}>
            <path data-effect="lip-shine" d="M496 1020Q549 1041 618 1018M536 955Q555 963 575 951" fill="none" stroke="#fff3e9"
              strokeLinecap="round" strokeWidth="9" filter={"url(#" + id + "-lips)"} opacity={Math.min(.54, .37 * lipStrength)} />
          </g>
        )}
        {shadowColor && (
          <g data-effect="eyes" clipPath={after}>
            {sampleBands.map((band, index) => {
              const key = id + "-eye-" + index;
              return <g key={key} clipPath={"url(#" + key + "-fence)"}>
                <path d={band.base} opacity={shadowOpacity * .72} fill={"url(#" + key + "-pigment)"} filter={"url(#" + key + "-base-blur)"} />
                <path d={band.wash} opacity={shadowOpacity * .84} fill={"url(#" + key + "-pigment)"} filter={"url(#" + key + "-blur)"} />
              </g>;
            })}
          </g>
        )}
        {(browColor || lashColor || linerColor) && <g clipPath={after}>
          {sampleDetails.eyes.map((eye, index) => <g key={index}>
            {browColor && <path data-effect="brows" d={eye.brow} fill={browColor} filter={"url(#" + id + "-brows)"}
              opacity={Math.min(.65, (strength?.browColor ?? 1) * .3)} />}
            {linerColor && <path data-effect="eyeliner" d={eye.lashLine} fill="none" stroke={linerColor} strokeLinecap="round"
              strokeWidth={eye.linerWidth} opacity={Math.min(.88, (strength?.linerColor ?? 1) * .62)} />}
            {lashColor && <path data-effect="lashes" d={eye.lashes} fill="none" stroke={lashColor} strokeLinecap="round"
              strokeWidth={eye.lashWidth} opacity={Math.min(.9, (strength?.lashColor ?? 1) * .68)} />}
          </g>)}
        </g>}
        {contourColor && <ContourPaint frame={sampleContour} sketch={contourSketch ?? emptyContour} color={contourColor}
          intensity={strength?.contourColor ?? 1} brush={brush} comparisonClip={brush ? undefined : after}
          view={{ x, y, width, height }} />}
      </svg>
      {compare && <span className={styles.divider} style={{ left: position + "%" }} aria-hidden="true"><span>‹ ›</span></span>}
      {compare && <span className={styles.before} aria-hidden="true">Before</span>}
      {!brush && !shadePreview && <span className={styles.after} aria-hidden="true">After</span>}
      {compare && <input type="range" aria-label="Compare before and after on the sample model" aria-valuetext={position + "% before"}
        value={position} onChange={(event) => setPosition(event.target.valueAsNumber)} />}
    </div>
  );
}

