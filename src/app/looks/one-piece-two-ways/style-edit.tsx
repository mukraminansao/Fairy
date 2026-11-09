"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { money, productHref } from "../../catalog";
import { defaultFashionLook, fittingHref } from "../../fashion-data";
import { getLookProduct } from "../../look-sets";
import { updateFashionLook, useClientReady } from "../../shop-state";
import { Icon } from "../../ui-icon";
import { OutfitFigure } from "../monochrome-street/outfit-figure";
import { twoWays } from "../two-ways";
import styles from "./style-edit.module.css";

const pieceLabels = ["Dress", "Shoes", "Bag", "Necklace"];

export function StyleEdit({ initialStyle, initialPiece, productSlugs }: {
  initialStyle: string; initialPiece?: string; productSlugs: Record<string, string>;
}) {
  const router = useRouter();
  const ready = useClientReady();
  const [style, setStyle] = useState(initialStyle);
  const [selected, setSelected] = useState(() => Math.max(0, pieceLabels.findIndex((label) => label.toLowerCase() === initialPiece)));
  const edit = twoWays.find(({ id }) => id === style) ?? twoWays[0];
  const items = edit.look.ids.map(getLookProduct);
  const product = items[selected];
  const detailsHref = productHref(productSlugs[product.id] ?? product.id);

  function updateView(key: "style" | "piece", value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({ fairyPreviousPage: window.history.state?.fairyPreviousPage }, "", url);
  }

  function switchStyle(id: string) {
    setStyle(id);
    updateView("style", id);
  }

  function selectPiece(index: number) {
    setSelected(index);
    updateView("piece", pieceLabels[index].toLowerCase());
  }

  function tryOutfit() {
    updateFashionLook(defaultFashionLook, () => edit.look);
    router.push(fittingHref + "?" + new URLSearchParams({ style }));
  }

  return <section className={styles.layout} aria-label="Style the rose satin dress">
    <div className={styles.stage}>
      <div className={styles.switcher} role="group" aria-label="Outfit occasion">
        {twoWays.map(({ id, label }) => <button type="button" key={id} aria-pressed={style === id} disabled={!ready}
          onClick={() => switchStyle(id)}>{label}</button>)}
      </div>
      <div className={styles.frame}>
        <div key={style} className={styles.figure}><OutfitFigure look={edit.look} /></div>
        {items.map(({ id, name }, index) => <button key={pieceLabels[index]} className={styles.hotspot} type="button"
          data-piece={pieceLabels[index].toLowerCase()} data-product={id} aria-label={"View " + name + " on the outfit"}
          aria-pressed={selected === index} onClick={() => selectPiece(index)}>{index + 1}</button>)}
      </div>
    </div>
    <div className={styles.copy}>
      <p className={styles.kicker}>The FAIRY styling edit</p>
      <h2>{edit.label}</h2>
      <p aria-live="polite">{edit.note}</p>
      <ul className={styles.items} aria-label="Pieces in this outfit">
        {items.map(({ id, name, previewImage, priceCents }, index) => <li key={id}>
          <button type="button" aria-pressed={selected === index} onClick={() => selectPiece(index)}>
            <Image src={previewImage} alt="" width={48} height={48} />
            <span><strong>{name}</strong><small>{index === 0 ? "Signature piece" : "Changes with the look"}</small></span>
            <span>{money(priceCents)}</span>
          </button>
        </li>)}
      </ul>
      <div className={styles.selected} aria-live="polite">
        <h3>{product.name}</h3>
        {product.description && <p>{product.description}</p>}
        <Link href={detailsHref}>View product details <Icon name="arrow" /></Link>
      </div>
      <button type="button" className={styles.try} onClick={tryOutfit} disabled={!ready}>Try this look <Icon name="arrow" /></button>
    </div>
  </section>;
}
