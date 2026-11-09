"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import styles from "./beauty-studio.module.css";

export function PersonalStage({ mode, phase, compare, children }: {
  mode: "camera" | "selfie"; phase: string; compare: boolean; children: ReactNode;
}) {
  const [position, setPosition] = useState(50);
  return <div className={styles.cameraStage} data-mode={mode} data-phase={phase} data-compare={compare || undefined}
    style={{ "--compare-position": position + "%" } as CSSProperties}
    aria-label={mode === "selfie" ? "Local selfie preview" : "Mirrored live camera preview"}>
    {children}
    {compare && <>
      <span className={styles.personalBefore} aria-hidden="true">Before</span>
      <span className={styles.personalAfter} aria-hidden="true">After</span>
      <span className={styles.personalDivider} aria-hidden="true"><span>‹ ›</span></span>
      <input className={styles.personalRange} type="range" min={0} max={100} value={position}
        aria-label={"Compare before and after on " + (mode === "selfie" ? "your selfie" : "the live camera")}
        aria-valuetext={position + "% before"} onChange={(event) => setPosition(event.currentTarget.valueAsNumber)} />
    </>}
  </div>;
}

