"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "../ui-icon";
import { afterDialogExit } from "./dialog-exit";
import styles from "./mobile-preview.module.css";

export function MobilePreview({ title, preview, children }: { title: string; preview: ReactNode; children: ReactNode }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  function locateOrigin(trigger: HTMLElement) {
    const source = trigger.parentElement?.querySelector("[data-preview-origin]")?.getBoundingClientRect();
    const rect = source && source.bottom > 0 && source.top < window.innerHeight ? source : trigger.getBoundingClientRect();
    const inset = [rect.top, window.innerWidth - rect.right, window.innerHeight - rect.bottom, rect.left];
    dialog.current?.style.setProperty("--preview-origin", "inset(" + inset.map((edge) => Math.max(0, edge) + "px").join(" ") + " round 12px)");
  }

  return <>
    <button type="button" className={styles.trigger} aria-haspopup="dialog" onClick={(event) => {
      locateOrigin(event.currentTarget);
      setShowPreview(true);
      dialog.current?.showModal();
    }}>Full-screen preview <Icon name="arrow" /></button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} data-motion-dialog
      onClose={(event) => afterDialogExit(event.currentTarget, () => setShowPreview(false))}>
      <header className={styles.heading}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label="Close preview" onClick={() => dialog.current?.close()}><Icon name="close" /></button>
      </header>
      {showPreview && <>
        <div className={styles.stage}>{preview}</div>
        <div className={styles.tray}>{children}</div>
      </>}
    </dialog>
  </>;
}
