"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui-icon";
import styles from "./shop.module.css";

export function BagButton({ disabled, confirmation, onAdd, mobileLabel, mobileStatus }: {
  disabled: boolean;
  confirmation?: number;
  onAdd: () => void;
  mobileLabel?: string;
  mobileStatus?: string;
}) {
  const primary = useRef<HTMLButtonElement>(null);
  const [outsideView, setOutsideView] = useState(false);
  const [dismissed, setDismissed] = useState<number>();
  const confirmed = confirmation !== undefined && confirmation !== dismissed;

  useEffect(() => {
    if (confirmation === undefined) return;
    const timeout = window.setTimeout(() => setDismissed(confirmation), 1100);
    return () => window.clearTimeout(timeout);
  }, [confirmation]);

  const hasMobileLabel = Boolean(mobileLabel);
  useEffect(() => {
    const button = primary.current;
    if (!button || !hasMobileLabel) return;
    const observer = new IntersectionObserver(([entry]) => {
      setOutsideView(!entry.isIntersecting);
    });
    observer.observe(button);
    return () => observer.disconnect();
  }, [hasMobileLabel]);

  const check = confirmed ? <Icon name="check" /> : null;
  return <>
    <button ref={primary} type="button" aria-label="Add to demo bag" data-confirmed={confirmed || undefined} disabled={disabled} onClick={onAdd}>
      <span className={styles.bagButtonLabel} data-width-label="Add to demo bag" aria-hidden="true">
        <span>{confirmed ? "Added to bag" : "Add to demo bag"}</span>
      </span>{check}
    </button>
    {mobileLabel && outsideView && <div className={styles.mobileBagBar} role="group" aria-label="Quick add to bag">
      <div><strong>{mobileLabel}</strong>{mobileStatus && <span>{mobileStatus}</span>}</div>
      <button type="button" aria-label="Add to bag" data-confirmed={confirmed || undefined} disabled={disabled} onClick={onAdd}>
        <span className={styles.bagButtonLabel} data-width-label="Added to bag" aria-hidden="true">
          <span>{confirmed ? "Added to bag" : "Add to bag"}</span>
        </span>{check}
      </button>
    </div>}
  </>;
}
