"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./home.module.css";

export function ProductRail({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function toggleMotion() {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused((current) => !current);
  }

  return (
    <section className={styles.productRail} aria-label="Featured products">
      <div ref={viewport} className={styles.railViewport} role="group" aria-label="Featured product photos" tabIndex={0}
        aria-describedby="featured-motion-hint" data-in-view={inView || undefined} data-paused={paused || undefined}
        onClick={toggleMotion} onKeyDown={(event) => {
          if (event.key !== " " || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          event.preventDefault();
          if (!event.repeat) toggleMotion();
        }}>
        <div className={styles.railTrack}>{children}</div>
      </div>
      <span id="featured-motion-hint" className={styles.motionHint}>Press Space or tap the row to pause or resume motion.</span>
      <span className={styles.motionHint} role="status">{paused ? "Product motion paused." : ""}</span>
    </section>
  );
}
