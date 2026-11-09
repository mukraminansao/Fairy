"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { getLookProduct, setHref, type LookSet } from "../look-sets";
import { Icon } from "../ui-icon";
import styles from "./look-collection.module.css";

export function SetPicker({ href, sets, active, label }: {
  href: string; sets: readonly LookSet[]; active: string; label: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const matches = sets.filter((set) => (set.title + " " + set.description).toLowerCase().includes(term));

  function open() {
    setQuery("");
    dialog.current?.showModal();
  }

  return (
    <nav className={styles.picker} aria-label={label}>
      <button type="button" className={styles.open} aria-haspopup="dialog" onClick={open}>
        <Icon name="layers" /> Browse sets <span aria-hidden="true">{sets.length}</span>
      </button>
      <dialog className={styles.dialog} ref={dialog} aria-label={"Browse " + label.toLowerCase()} data-motion-dialog>
        <div className={styles.dialogHeader}>
          <div>
            <p>Shop the look</p>
            <h2>{label}</h2>
          </div>
          <button type="button" aria-label="Close set browser" onClick={() => dialog.current?.close()}>
            <Icon name="close" />
          </button>
        </div>
        <div className={styles.search}>
          <Icon name="search" />
          <input type="search" aria-label={"Search " + label.toLowerCase()} placeholder="Search sets"
            value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className={styles.results}>
          {matches.length > 0 ? (
            <ul>
              {matches.map((set) => (
                <li key={set.id}>
                  <Link href={setHref(href, sets, set.id)} scroll={false}
                    aria-current={set.id === active ? "page" : undefined} onClick={() => dialog.current?.close()}>
                    <Image src={set.image} alt="" width={68} height={68} />
                    <span><strong>{set.title}</strong><small>{set.description}</small></span>
                    <Icon name="arrow" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p role="status">No sets match “{query.trim()}”.</p>}
        </div>
      </dialog>
    </nav>
  );
}

export function CollectionPhoto({ set, selectedId, inspectedId, onInspect, onSelect }: {
  set: LookSet; selectedId: string; inspectedId: string | null;
  onInspect: (id: string | null) => void; onSelect: (id: string) => void;
}) {
  const [width, height] = set.imageSize;
  const [cropTop, cropHeight] = set.photoCrop ?? [0, height];
  const active = set.hotspots.find(({ productId }) => productId === (inspectedId ?? selectedId)) ?? set.hotspots[0];
  const [x, y, w, h] = active.rect;
  const hitOrder = [...set.hotspots].sort((a, b) => a.priority - b.priority);
  return (
    <div className={styles.scene} style={{ aspectRatio: width + " / " + cropHeight, "--scene-ratio": width / cropHeight } as CSSProperties}>
      <Image src={set.image} alt={set.title + " shoppable flat-lay"} width={width} height={height}
        preload unoptimized onLoad={(event) => { event.currentTarget.dataset.sceneReady = ""; }}
        style={{ top: -cropTop / cropHeight * 100 + "%", height: height / cropHeight * 100 + "%" }} />
      <div role="group" aria-label={"Products in " + set.title}>
        {set.hotspots.map(({ productId, rect: [left, top, itemWidth, itemHeight] }) => (
          <button type="button" className={styles.hotspot} key={productId}
            aria-label={"Select " + getLookProduct(productId).name} aria-pressed={productId === selectedId}
            onFocus={() => onInspect(productId)} onBlur={() => onInspect(null)} onClick={() => onSelect(productId)}
            style={{ left: left / width * 100 + "%", top: (top - cropTop) / cropHeight * 100 + "%",
              width: itemWidth / width * 100 + "%", height: itemHeight / cropHeight * 100 + "%" }} />
        ))}
      </div>
      <svg className={styles.hitLayer} viewBox={`0 ${cropTop} ${width} ${cropHeight}`} aria-hidden="true">
        {hitOrder.map(({ productId, shape }) => (
          <path key={productId} data-item={productId} d={shape}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") onInspect(productId); }}
            onPointerLeave={() => onInspect(null)} onClick={() => onSelect(productId)} />
        ))}
        <path d={active.shape} className={styles.outline} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className={styles.tooltip} aria-hidden="true" style={{
        "--tip-x": Math.min((x + w * .82) / width * 100, 61) + "%",
        "--tip-y": (y + h * .84 - cropTop) / cropHeight * 100 + "%",
      } as CSSProperties}>{active.productId === selectedId ? "Selected: " : ""}{getLookProduct(active.productId).name}</span>
    </div>
  );
}

