"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { money, productHref, type Product } from "../../catalog";
import { fashionSets, getLookProduct, getSetItemId, setHref, type LookSet } from "../../look-sets";
import { CollectionPhoto } from "../look-collection";
import {
  addFashionPiece, defaultFashionLook, defaultPendant, emptyFashionLook, fashionItems, fashionScene, fittingHref,
  getFashionItem, lookItemName, type FashionItem, type PendantColor,
} from "../../fashion-data";
import { undoFashionEdit, updateFashionLook, useShopState, type FashionLook } from "../../shop-state";
import { Icon } from "../../ui-icon";
import { FittingPreview } from "./fitting-preview";
import { OutfitFigure } from "./outfit-figure";
import { SceneConnector } from "../scene-connector";
import styles from "./fashion.module.css";

const [photoWidth, photoHeight] = fashionScene.imageSize;
// The viewport trims only the empty border. Hotspots stay in original photo coordinates.
const photoCrop = { x: 5, y: 125, width: 708, height: 1067 };
const photoCropStyle = {
  aspectRatio: photoCrop.width + " / " + photoCrop.height,
  "--source-left": (-photoCrop.x / photoCrop.width * 100) + "%",
  "--source-top": (-photoCrop.y / photoCrop.height * 100) + "%",
  "--source-width": (photoWidth / photoCrop.width * 100) + "%",
  "--source-height": (photoHeight / photoCrop.height * 100) + "%",
} as CSSProperties;
const pendantAnchor = [680, 510] as const;
const pointerItems = [...fashionItems].sort((a, b) => a.priority - b.priority);
const pendantDescription = "A modern cross pendant with a clean, bold edge. A versatile piece that completes the look with understated impact.";

function spotStyle(item: FashionItem): CSSProperties {
  const [x, y, w, h] = item.rect;
  return {
    left: (x / photoWidth * 100) + "%",
    top: (y / photoHeight * 100) + "%",
    width: (w / photoWidth * 100) + "%",
    height: (h / photoHeight * 100) + "%",
  };
}

function FlatLay({
  active, selected, onInspect, onSelect,
}: {
  active: FashionItem;
  selected: FashionItem;
  onInspect: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const [x, y, w, h] = active.rect;
  const label = active.productId === selected.productId ? "Selected: " : "";
  const text = active.productId === defaultPendant ? "Silver Pendant" : active.product.name;
  return (
    <div className={styles.art} style={photoCropStyle}>
      <div className={styles.photoCrop}>
        <Image src={fashionScene.image} alt="Original Monochrome Street flat-lay with a track jacket, cargo pants, sneakers and accessories"
          width={photoWidth} height={photoHeight} preload unoptimized className={styles.original}
          onLoad={(event) => { event.currentTarget.dataset.sceneReady = ""; }} />
      </div>
      <div className={styles.photoOverlay}>
        <div role="group" aria-label="Items in the flat-lay">
          {fashionItems.map((item) => (
            <button key={item.productId} type="button" className={styles.sceneButton}
              aria-label={"Select " + item.product.name} aria-pressed={selected.productId === item.productId}
              onFocus={() => onInspect(item.productId)} onBlur={() => onInspect(null)}
              onClick={() => onSelect(item.productId)} style={spotStyle(item)} />
          ))}
        </div>
        <svg aria-hidden="true" className={styles.hitLayer} viewBox={"0 0 " + photoWidth + " " + photoHeight}>
          {pointerItems.map((item) => (
            <path key={item.productId} data-item={item.productId} d={item.path}
              onPointerEnter={(event) => { if (event.pointerType === "mouse") onInspect(item.productId); }}
              onPointerLeave={() => onInspect(null)}
              onClick={() => onSelect(item.productId)} />
          ))}
          <path d={active.path} className={styles.outline} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <span className={styles.tip} aria-hidden="true" style={{
        "--tip-x": ((x + w - photoCrop.x) / photoCrop.width * 100) + "%",
        "--tip-y": ((y + h * (active.productId === defaultPendant ? .79 : .5) - photoCrop.y) / photoCrop.height * 100) + "%",
      } as CSSProperties}>{label}{text}</span>
    </div>
  );
}

function ItemImage({ product }: { product: Product }) {
  const alt = product.id === defaultPendant
    ? "Close-up of the silver cross pendant with black inlay"
    : product.id === "f-jacket"
      ? "Monochrome Track Jacket with a stylized R and Better Days Ahead patch"
      : product.name + " studio close-up";
  return <Image src={product.previewImage} alt={alt} fill sizes="(max-width: 639px) 100vw, 520px" quality={85} />;
}

function LookSummary({ look, set, selectedId, preview, onWear, onUndo }: {
  look: FashionLook; set: LookSet; selectedId: string; preview: boolean; onWear?: () => void; onUndo?: () => void;
}) {
  const { ids } = look;
  return (
    <section className={styles.lookCard} aria-labelledby="look-heading">
      <div className={styles.mannequin}>
        <OutfitFigure look={look} />
      </div>
      <div className={styles.lookCopy}>
        <h2 id="look-heading">{preview ? "Set preview" : "Your look so far"}</h2>
        <div className={styles.lookItems} aria-live="polite">
          {ids.length ? (
            <ul aria-label="Pieces in your look">
              {ids.map((id, index) => (
                <li key={id}>{lookItemName(id)}{index < ids.length - 1 && <span aria-hidden="true">·</span>}</li>
              ))}
            </ul>
          ) : <p>Add pieces from the photo to start a look.</p>}
        </div>
        {onWear && <button type="button" className={styles.wearSet} onClick={onWear}>Wear this set</button>}
        {onUndo && <button type="button" className={styles.wearSet} onClick={onUndo}>Undo outfit change</button>}
        {onWear && <p className={styles.setNote}>Replaces your current outfit with all {set.itemIds.length} pieces from this set.</p>}
        <Link className={styles.outlineButton} href={setHref(fittingHref, fashionSets, set.id, selectedId)}>Open virtual fitting room</Link>
      </div>
    </section>
  );
}

export function FashionScene({ initialItemId, set }: { initialItemId: string; set: LookSet }) {
  const [selectedId, setSelectedId] = useState(initialItemId);
  const [inspected, setInspected] = useState<string | null>(null);
  const [tab, setTab] = useState<"details" | "try-on">("details");
  const [color, setColor] = useState<PendantColor | null>(null);
  const [status, setStatus] = useState("");
  const [dialogMode, setDialogMode] = useState<"zoom" | "details" | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const macroRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const detailsTabRef = useRef<HTMLButtonElement>(null);
  const itemHeadingRef = useRef<HTMLHeadingElement>(null);
  const tryOnTabRef = useRef<HTMLButtonElement>(null);
  const selected = getFashionItem(selectedId);
  const product = getLookProduct(selectedId);
  const isOriginalScene = set.id === fashionScene.id;
  const description = product.id === defaultPendant ? pendantDescription : product.description ??
    "From the Monochrome Street edit. This studio close-up was created from the original flat-lay.";
  const isPendant = product.id === defaultPendant;
  const active = inspected ? getFashionItem(inspected) : selected;
  const { fashionLook: savedLook, previousFashionLook } = useShopState();
  const initialLook = isOriginalScene ? defaultFashionLook : emptyFashionLook;
  const look = savedLook ?? initialLook;
  const curatedLook: FashionLook = { ids: [...set.itemIds], pendantColor: look.pendantColor };
  const previewSet = !isOriginalScene && savedLook === undefined;
  const displayedLook = previewSet ? curatedLook : look;
  const pendantColor = color ?? look.pendantColor;
  const details = product.details;
  const price = money(product.priceCents).replace(/\.00$/, "");

  useEffect(() => {
    const syncSelection = () => {
      setSelectedId(getSetItemId(set, new URLSearchParams(window.location.search).get("item")));
      setInspected(null);
      setTab("details");
      setStatus("");
    };
    window.addEventListener("popstate", syncSelection);
    return () => window.removeEventListener("popstate", syncSelection);
  }, [set]);

  function select(id: string) {
    setStatus("");
    setTab("details");
    if (window.matchMedia("(max-width: 1200px)").matches) {
      window.requestAnimationFrame(() => {
        const heading = itemHeadingRef.current;
        if (!heading) return;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      });
    }
    if (id === selectedId) return;
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("item", id);
    window.history.pushState(null, "", url);
  }

  function addToLook() {
    const changedColor = isPendant && pendantColor !== look.pendantColor;
    if (look.ids.includes(product.id) && !changedColor) {
      setStatus(product.name + " is already in your look.");
      return;
    }
    updateFashionLook(initialLook, (current) => ({
      ids: addFashionPiece(current.ids, product.id),
      pendantColor: isPendant ? pendantColor : current.pendantColor,
    }));
    const removed = look.ids.filter((id) => !addFashionPiece(look.ids, product.id).includes(id));
    setStatus(changedColor ? "Pendant color updated in your look." : product.name + " added to your look." +
      (removed.length ? " Replaced " + removed.map(lookItemName).join(", ") + "." : ""));
  }

  function wearSet() {
    updateFashionLook(initialLook, () => curatedLook);
    setStatus(set.title + " is now your look.");
  }

  function openDialog(mode: "zoom" | "details") {
    setDialogMode(mode);
    dialogRef.current?.showModal();
  }

  return (
    <div className={styles.layout} ref={layoutRef}>
      <section aria-labelledby="fashion-heading" className={styles.scene}>
        <div className={styles.intro}>
          <h1 id="fashion-heading">{isOriginalScene ? "Make the look yours." : set.title}</h1>
          <p>{isOriginalScene ? "Click any item in this image to see it up close." : set.itemIds.length + " pieces to shop and style."}</p>
        </div>
        <div ref={photoRef} className={isOriginalScene ? styles.photoFrame : undefined}>
          {isOriginalScene ? (
            <>
              <FlatLay active={active} selected={selected} onInspect={setInspected} onSelect={select} />
              <p className={styles.sceneLabel}>01 / Monochrome Street</p>
            </>
          ) : <CollectionPhoto set={set} selectedId={selectedId} inspectedId={inspected} onInspect={setInspected} onSelect={select} />}
        </div>
        <div className={styles.itemPicker}>
          <label htmlFor="scene-item">Choose an item</label>
          <select id="scene-item" value={selectedId} onChange={(event) => { setInspected(null); select(event.target.value); }}>
            {set.itemIds.map((id) => <option key={id} value={id}>{getLookProduct(id).name}</option>)}
          </select>
          <a className={styles.jumpLink} href={tab === "details" ? "#fashion-item-heading" : "#try-on-panel"}>View selection <Icon name="arrow" /></a>
        </div>
      </section>

      <div className={styles.edit}>
        <div className={styles.tabs} role="tablist" aria-label="Fashion scene panels" onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "details" : event.key === "End" ? "try-on" : tab === "details" ? "try-on" : "details";
          setTab(next);
          (next === "details" ? detailsTabRef : tryOnTabRef).current?.focus();
        }}>
          <button id="details-tab" ref={detailsTabRef} type="button" role="tab" aria-selected={tab === "details"}
            aria-controls="item-details" tabIndex={tab === "details" ? 0 : -1} onClick={() => setTab("details")}>Item details</button>
          <button id="try-on-tab" ref={tryOnTabRef} type="button" role="tab" aria-selected={tab === "try-on"}
            aria-controls="try-on-panel" tabIndex={tab === "try-on" ? 0 : -1} onClick={() => setTab("try-on")}>Virtual try-on</button>
        </div>

        <div id="item-details" role="tabpanel" aria-labelledby="details-tab" tabIndex={0} hidden={tab !== "details"}>
          <div className={styles.detailsGrid}>
            <button className={styles.macro} type="button" ref={macroRef} aria-label={"Zoom " + product.name}
              onClick={() => openDialog("zoom")}>
              <span className={styles.previewMedia + " fairy-detail-reveal"} key={product.id}><ItemImage product={product} /></span>
              <span className={styles.zoomHint}><Icon name="search" /> Zoom photo</span>
            </button>
            <div className={styles.details}>
              <div aria-live="polite">
                <h2 id="fashion-item-heading" ref={itemHeadingRef} tabIndex={-1}>
                  <span key={product.id} className="fairy-selection-label">{product.name}</span>
                </h2>
                <p className={styles.price}>{price}</p>
                <p className={styles.description}>{description}</p>
              </div>
              {details && (
                <dl className={styles.attributes}>
                  <div><dt>Material</dt><dd>{details.material.replace(" (demo copy)", "")}</dd></div>
                  <div><dt>Finish</dt><dd>{details.finish}</dd></div>
                </dl>
              )}
              {isPendant && (
                <fieldset className={styles.colors}>
                  <legend>Color</legend>
                  {(["black", "silver"] as const).map((option) => (
                    <button key={option} type="button" data-color={option} aria-label={option === "black" ? "Black inlay" : "Silver finish"}
                      aria-pressed={pendantColor === option} onClick={() => { setColor(option); setStatus(""); }} />
                  ))}
                </fieldset>
              )}
              {isPendant && pendantColor === "silver" && <p className={styles.colorNote}>Silver selected. Photo shows the black inlay.</p>}
              <button type="button" className={styles.addButton} onClick={addToLook}>Add to look</button>
              <button type="button" className={styles.detailsLink} onClick={() => openDialog("details")}>
                <span>View product details</span><Icon name="arrow" />
              </button>
              <p role="status" className={styles.status}>{status}</p>
            </div>
          </div>
        </div>

        <div id="try-on-panel" role="tabpanel" aria-labelledby="try-on-tab" tabIndex={0} hidden={tab !== "try-on"}>
          {tab === "try-on" && <FittingPreview initialLook={displayedLook} />}
        </div>
        {tab === "details" && <LookSummary look={displayedLook} set={set} selectedId={selectedId} preview={previewSet} onWear={isOriginalScene ? undefined : wearSet}
          onUndo={previousFashionLook ? () => { if (undoFashionEdit()) { setColor(null); setStatus("Last outfit change undone."); } } : undefined} />}
      </div>

      {tab === "details" && (
        <SceneConnector key={product.id} itemId={product.id} layoutRef={layoutRef} photoRef={photoRef} macroRef={macroRef}
          anchor={isOriginalScene && isPendant ? pendantAnchor : undefined} />
      )}
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="product-dialog-heading" onClose={() => setDialogMode(null)}>
        <div className={styles.dialogHeader}>
          <h2 id="product-dialog-heading">{product.name}</h2>
          <button type="button" aria-label="Close product preview" onClick={() => dialogRef.current?.close()}><Icon name="close" /></button>
        </div>
        {dialogMode && <div className={styles.dialogImage}><ItemImage product={product} /></div>}
        {dialogMode === "details" && (
          <div className={styles.dialogDetails}>
            <p>{money(product.priceCents)} · Demo product · {product.sku}</p>
            <p>{description}</p>
            {details && <p>Material shown in the demo catalog: {details.material.replace(" (demo copy)", "")}. Finish: {details.finish}.</p>}
            <Link className={styles.outlineButton} href={productHref(product.id)} onClick={() => dialogRef.current?.close()}>Open product page</Link>
          </div>
        )}
      </dialog>
    </div>
  );
}
