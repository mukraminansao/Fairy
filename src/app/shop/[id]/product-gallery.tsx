"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "../../ui-icon";
import styles from "../catalog.module.css";

type Photo = { path: string; alt: string };

export function ProductGallery({ photos, name, photographed }: { photos: Photo[]; name: string; photographed?: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const photo = photos[active] ?? photos[0];
  if (!photo) return null;

  return <div>
    <button className={styles.detailPhoto} type="button" aria-label={"Enlarge photo of " + name} onClick={() => {
      setZoomed(true);
      dialog.current?.showModal();
    }}>
      <Image src={photo.path} alt={photo.alt} fill preload={active === 0} sizes="(max-width: 760px) 95vw, 48vw" quality={85} />
      {active === 0 && photographed && <span className={styles.shownShade}>Shown in {photographed}</span>}
      <span className={styles.enlarge}><Icon name="search" /> Enlarge</span>
    </button>
    {photos.length > 1 && <div className={styles.photoChoices} role="group" aria-label="Product photos">
      {photos.map(({ path }, index) => <button key={path} type="button" aria-label={"Show photo " + (index + 1)}
        aria-pressed={active === index} onClick={() => setActive(index)}>
        <Image src={path} alt="" width={56} height={56} />
      </button>)}
    </div>}
    <dialog ref={dialog} className={styles.photoDialog} aria-label={name + " photo"} onClose={() => setZoomed(false)}>
      <button type="button" className={styles.closePhoto} onClick={() => dialog.current?.close()} aria-label="Close photo"><Icon name="close" /></button>
      {zoomed && <Image src={photo.path} alt={photo.alt} fill sizes="(max-width: 850px) 94vw, 850px" quality={85} />}
    </dialog>
  </div>;
}
