"use client";

import { useId, useRef, useState } from "react";
import { products } from "../../catalog";
import type { ContourSketch } from "../../contour-sketch";
import { FacePreview, type ModelTone } from "../../looks/soft-rose-edit/face-preview";
import {
  beautyArea, eyeshadowId, getBeautyEffects, getLipstickShade, getProductPan, lipstickId, lipstickShades,
  tryOnPalette, type BeautyArea, type BeautyLook, type TryOnPan,
} from "../../makeup-data";
import { Icon } from "../../ui-icon";
import { afterDialogExit } from "../dialog-exit";
import styles from "./beauty-studio.module.css";

export type ShadeChoice = { options: readonly TryOnPan[]; currentId: string; onSelect: (id: string) => void };

const areaNames: Record<BeautyArea, string> = {
  lips: "Lip color", cheeks: "Blush", eyes: "Eyeshadow", skin: "Complexion",
  brows: "Brows", lashes: "Lashes", contour: "Contour", eyeliner: "Eyeliner",
};
const groups = Object.entries(areaNames).map(([area, name]) => ({
  name, items: products.filter(({ id }) => beautyArea(id) === area),
})).filter(({ items }) => items.length > 0);
const comparable = groups.flatMap(({ items }) => items);
const comparisonTitle = "Compare products & shades";
const sampleContour: ContourSketch = {
  blend: 82,
  strokes: [
    { size: 12, points: [[260, 589], [289, 607], [331, 622], [370, 631]] },
    { size: 12, points: [[740, 589], [711, 607], [669, 622], [630, 631]] },
  ],
};
type Selection = { productId: string; shadeId?: string };

export function productShade(look: BeautyLook, id: string) {
  return id === lipstickId ? getLipstickShade(look.lipstickShadeId)
    : getProductPan(id, id === eyeshadowId ? look.eyeshadowShadeId : look.productPanIds?.[id]);
}

export function withShade(look: BeautyLook, productId: string, id: string): BeautyLook {
  if (productId === lipstickId) return { ...look, lipstickShadeId: id };
  if (productId === eyeshadowId) return { ...look, eyeshadowShadeId: id };
  return { ...look, productPanIds: { ...look.productPanIds, [productId]: id } };
}

export function ShadeComparison({ activeProductId, look, modelTone, disabled, onApply }: {
  activeProductId?: string; look: BeautyLook; modelTone: ModelTone; disabled: boolean;
  onApply: (productId: string, shadeId?: string) => void;
}) {
  const title = useId();
  const description = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Selection[]>([]);

  function selectionFor(productId: string): Selection {
    return { productId, shadeId: productShade(look, productId)?.id };
  }

  function open() {
    const product = comparable.find(({ id }) => id === activeProductId) ?? comparable[0];
    const first = selectionFor(product.id);
    const options = product.id === lipstickId ? lipstickShades : tryOnPalette(product.id);
    const alternateShade = options?.find(({ id }) => id !== first.shadeId);
    const area = beautyArea(product.id);
    const alternateProduct = comparable.find(({ id }) => id !== product.id && beautyArea(id) === area)
      ?? comparable.find(({ id }) => id !== product.id);
    const second = alternateShade ? { ...first, shadeId: alternateShade.id }
      : alternateProduct ? selectionFor(alternateProduct.id) : first;
    setSelected([first, second]);
    dialog.current?.showModal();
  }

  function chooseSide(index: number, next: Selection) {
    setSelected((current) => current.map((side, position) => position === index ? next : side));
  }

  const portrait = selected.some(({ productId }) => beautyArea(productId) === "contour");
  const hasDrawnContour = Boolean(look.contourSketch?.strokes.length);

  return <>
    <button type="button" className={styles.compareShades} aria-haspopup="dialog" disabled={disabled} onClick={open}>
      {comparisonTitle}
    </button>
    <dialog ref={dialog} className={styles.picker + " " + styles.shadeComparison}
      aria-labelledby={title} aria-describedby={description} data-motion-dialog
      onClose={(event) => afterDialogExit(event.currentTarget, () => setSelected([]))}>
      <div className={styles.pickerHeader}>
        <h2 id={title}>{comparisonTitle}</h2>
        <button type="button" aria-label="Close comparison" onClick={() => dialog.current?.close()}><Icon name="close" /></button>
      </div>
      <p id={description}>Choose two products or two shades of the same product. For items with one shade, choose a different product on each side.</p>
      {portrait && <p className={styles.comparisonNote}>{hasDrawnContour
        ? "Contour previews use your own placement."
        : "Contour previews use sample strokes here. Draw your own placement when you apply the product."}</p>}
      <div className={styles.shadeColumns}>
        {selected.map(({ productId, shadeId }, index) => {
          const side = index === 0 ? "A" : "B";
          const product = comparable.find(({ id }) => id === productId)!;
          const options = productId === lipstickId ? lipstickShades : tryOnPalette(productId);
          const option = options?.find(({ id }) => id === shadeId);
          const isolated = { ...look, ids: [productId],
            contourSketch: hasDrawnContour ? look.contourSketch : sampleContour,
          };
          const preview = shadeId ? withShade(isolated, productId, shadeId) : isolated;
          return <section key={side} aria-label={"Product " + side + " preview"}>
            <label>Product {side}<select value={productId} onChange={(event) => chooseSide(index, selectionFor(event.currentTarget.value))}>
              {groups.map(({ name, items }) => <optgroup key={name} label={name}>
                {items.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </optgroup>)}
            </select></label>
            {options ? <label>Shade {side}<select value={shadeId} onChange={(event) => chooseSide(index, { productId, shadeId: event.currentTarget.value })}>
              {options.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select></label>
              : <p className={styles.singleShade}>Shade {side}<span>One shade</span></p>}
            <FacePreview {...getBeautyEffects(preview)} studio modelTone={modelTone} compare={false} shadePreview portrait={portrait} />
            <button type="button" className={styles.compareShades} onClick={() => {
              onApply(productId, shadeId);
              dialog.current?.close();
            }}>Use {option?.name ?? product.name} <span className={styles.shadeSide}>({side})</span></button>
          </section>;
        })}
      </div>
    </dialog>
  </>;
}
