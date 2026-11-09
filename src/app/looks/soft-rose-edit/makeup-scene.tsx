"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { money, productHref, type Product } from "../../catalog";
import { beautySets, getLookProduct, getSetItemId, setHref, type LookSet } from "../../look-sets";
import { CollectionPhoto } from "../look-collection";
import {
  addBeautyPiece, beautyArea, beautyLookLabel, beautyStudioHref, defaultBeautyLook, defaultShade, eyeshadowId, getBeautyEffects, getLipstickShade, getMakeupItem, getProductPan, lipstickId, lipstickShades, tryOnPalette,
  makeupItems, makeupScene, type BeautyEffects, type BeautyLook, type MakeupItem,
} from "../../makeup-data";
import { updateBeautyLook, useClientReady, useShopState } from "../../shop-state";
import { Icon } from "../../ui-icon";
import { FacePreview } from "./face-preview";
import { PaletteShades } from "./palette-shades";
import { SceneConnector } from "../scene-connector";
import styles from "./makeup.module.css";

const [photoWidth, photoHeight] = makeupScene.imageSize;
const [cropTop, cropHeight] = makeupScene.photoCrop ?? [145, 1145];
const lipCap = "M514 425Q514 416 524 416H587Q597 416 597 425V637Q597 646 587 646H524Q514 646 514 637Z";
const lipstickAnchor = [498, 613] as const;
const pointerItems = [...makeupItems].sort((a, b) => a.priority - b.priority);

function ProductPhoto({ product, closeCrop = false }: { product: Product; closeCrop?: boolean }) {
  const isLipstick = product.id === lipstickId;
  const lipstickCrop = isLipstick && closeCrop;
  const sizes = lipstickCrop ? "(max-width: 600px) 125vw, 710px" : "(max-width: 600px) 100vw, 520px";

  return (
    <Image src={product.previewImage}
      alt={isLipstick ? "Soft Mocha Satin Lipstick close-up" : product.name + " close-up"}
      width={1254} height={1254} quality={85} sizes={sizes}
      className={lipstickCrop ? styles.macroLipstick : styles.productPhoto} />
  );
}

function MakeupPhoto({ active, selectedId, onInspect, onSelect }: {
  active: MakeupItem; selectedId: string; onInspect: (id: string | null) => void; onSelect: (id: string) => void;
}) {
  const [x, y, width, height] = active.bounds;
  return (
    <div className={styles.photo} style={{ "--photo-ratio": photoWidth / cropHeight } as CSSProperties}>
      <Image src={makeupScene.image} alt="Soft Rose Edit flat-lay with makeup, serum, perfume, and a powder brush"
        width={photoWidth} height={photoHeight} preload unoptimized
        onLoad={(event) => { event.currentTarget.dataset.sceneReady = ""; }}
        style={{ top: -cropTop / cropHeight * 100 + "%", height: photoHeight / cropHeight * 100 + "%" }} />
      <div role="group" aria-label="Products in the makeup photo">
        {makeupItems.map((item) => {
          const [left, top, w, h] = item.bounds;
          return (
            <button type="button" key={item.productId} className={styles.hotspot}
              aria-label={"Select " + item.product.name} aria-pressed={selectedId === item.productId}
              onFocus={() => onInspect(item.productId)} onBlur={() => onInspect(null)} onClick={() => onSelect(item.productId)}
              style={{ left: left / photoWidth * 100 + "%", top: (top - cropTop) / cropHeight * 100 + "%",
                width: w / photoWidth * 100 + "%", height: h / cropHeight * 100 + "%" }} />
          );
        })}
      </div>
      <svg className={styles.hitLayer} viewBox={`0 ${cropTop} ${photoWidth} ${cropHeight}`} aria-hidden="true">
        {pointerItems.map((item) => (
          <path key={item.productId} data-item={item.productId}
            d={item.shape + (item.productId === lipstickId ? " " + lipCap : "")}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") onInspect(item.productId); }}
            onPointerLeave={() => onInspect(null)} onClick={() => onSelect(item.productId)} />
        ))}
        <path className={styles.outline} d={active.shape} vectorEffect="non-scaling-stroke" />
      </svg>
      <span aria-hidden="true" className={styles.tooltip} style={{
        "--tip-x": Math.min((x + width) / photoWidth * 100, 56) + "%",
        "--tip-y": (y + height * .9 - cropTop) / cropHeight * 100 + "%",
      } as CSSProperties}>{active.productId === selectedId ? "Selected: " : ""}{active.product.name}</span>
    </div>
  );
}

function EditSummary({ look, effects, selectedId, set }: { look: BeautyLook; effects: BeautyEffects; selectedId: string; set: LookSet }) {
  return (
    <section className={styles.editCard} aria-labelledby="try-on-heading">
      <FacePreview {...effects} />
      <div className={styles.editCopy}>
        <h2 id="try-on-heading">Try the shade on you</h2>
        <h3>Your beauty edit</h3>
        {look.ids.length > 0 ? (
          <ul aria-label="Products in your beauty edit">
            {look.ids.map((id) => <li key={id}>{beautyLookLabel(id)}</li>)}
          </ul>
        ) : <p>Add a product to start your beauty edit.</p>}
        <Link href={setHref(beautyStudioHref, beautySets, set.id, selectedId)}
          className={styles.studioButton}>Open virtual makeup try-on</Link>
      </div>
    </section>
  );
}

export function MakeupScene({ initialItemId, set }: { initialItemId: string; set: LookSet }) {
  const ready = useClientReady();
  const [selectedId, setSelectedId] = useState(initialItemId);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState(false);
  const [dialogMode, setDialogMode] = useState<"zoom" | "details" | null>(null);
  const [status, setStatus] = useState("");
  const layoutRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const macroRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const detailsTab = useRef<HTMLButtonElement>(null);
  const tryOnTab = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const look = useShopState().beautyLook ?? defaultBeautyLook;
  const item = getMakeupItem(selectedId);
  const product = getLookProduct(selectedId);
  const isOriginalScene = set.id === makeupScene.id;
  const description = product.description ?? item.description;
  const shade = getLipstickShade(look.lipstickShadeId);
  const isLipstick = product.id === lipstickId;
  const palette = tryOnPalette(product.id);
  const area = beautyArea(product.id);
  const pan = getProductPan(product.id, product.id === eyeshadowId ? look.eyeshadowShadeId : look.productPanIds?.[product.id]);
  const effects = getBeautyEffects(look);
  const hasAnotherLipstick = effects.lipColor !== undefined && !look.ids.includes(lipstickId);
  if (isLipstick) effects.lipColor ??= shade.hex;
  if (product.id === "b-blush") effects.blushColor ??= "#d05366";
  if (pan && area === "eyes") effects.shadowColor = pan.hex;
  if (pan && area === "contour") {
    effects.contourColor = pan.hex;
    effects.contourSketch = look.contourSketch;
  }

  function choosePan(id: string) {
    updateBeautyLook((current) => product.id === eyeshadowId ? { ...current, eyeshadowShadeId: id } :
      { ...current, productPanIds: { ...current.productPanIds, [product.id]: id } });
    setStatus("");
  }

  const panControls = palette && pan && <PaletteShades palette={palette} selectedId={pan.id}
    label={area === "contour" ? "Contour palette shades" : undefined} onSelect={choosePan} />;

  useEffect(() => {
    function sync() {
      setSelectedId(getSetItemId(set, new URLSearchParams(window.location.search).get("item")));
      setInspectedId(null);
      setPreviewTab(false);
      setStatus("");
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [set]);

  function select(id: string) {
    setPreviewTab(false);
    setStatus("");
    if (id !== selectedId) {
      setSelectedId(id);
      const url = new URL(window.location.href);
      url.searchParams.set("item", id);
      window.history.pushState(null, "", url);
    }
    if (window.matchMedia("(max-width: 1000px)").matches) {
      window.requestAnimationFrame(() => {
        const heading = headingRef.current;
        heading?.focus({ preventScroll: true });
        heading?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      });
    }
  }

  function addToLook() {
    const name = isLipstick ? shade.name + " " + product.name : product.name;
    if (look.ids.includes(product.id)) {
      setStatus(name + " is already in your beauty edit.");
      return;
    }
    updateBeautyLook((current) => ({ ...current, ids: addBeautyPiece(current.ids, product.id) }));
    const nextIds = addBeautyPiece(look.ids, product.id);
    const replaced = look.ids.find((id) => !nextIds.includes(id));
    setStatus(name + " added to your beauty edit." + (replaced ? " Replaced " + getLookProduct(replaced).name + "." : ""));
  }

  function openDialog(mode: "zoom" | "details") {
    setDialogMode(mode);
    dialog.current?.showModal();
  }

  return (
    <div ref={layoutRef} className={styles.layout}>
      <section ref={sceneRef} aria-labelledby="makeup-heading">
        <div className={styles.intro}>
          <h1 id="makeup-heading">{isOriginalScene ? "Create your signature glow." : set.title}</h1>
          <p>{isOriginalScene ? "Tap any product in this photo to shop the exact shade." : set.itemIds.length + " products to shop and try."}</p>
        </div>
        {isOriginalScene ? (
          <MakeupPhoto active={getMakeupItem(inspectedId ?? selectedId)} selectedId={selectedId} onInspect={setInspectedId} onSelect={select} />
        ) : <CollectionPhoto set={set} selectedId={selectedId} inspectedId={inspectedId} onInspect={setInspectedId} onSelect={select} />}
        <div className={styles.picker}>
          <label htmlFor="makeup-item">Choose a product</label>
          <select id="makeup-item" value={selectedId} onChange={(event) => { setInspectedId(null); select(event.target.value); }}>
            {set.itemIds.map((id) => <option key={id} value={id}>{getLookProduct(id).name}</option>)}
          </select>
        </div>
      </section>

      <div className={styles.detailsColumn}>
        <div className={styles.tabs} role="tablist" aria-label="Makeup scene panels" onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? false : event.key === "End" ? true : !previewTab;
          setPreviewTab(next);
          (next ? tryOnTab : detailsTab).current?.focus();
        }}>
          <button id="makeup-details-tab" type="button" ref={detailsTab} role="tab" tabIndex={previewTab ? -1 : 0}
            aria-selected={!previewTab} aria-controls="makeup-details" onClick={() => setPreviewTab(false)}>Item details</button>
          <button id="makeup-preview-tab" type="button" ref={tryOnTab} role="tab" tabIndex={previewTab ? 0 : -1}
            aria-selected={previewTab} aria-controls="makeup-preview" onClick={() => setPreviewTab(true)}>Virtual try-on</button>
        </div>

        <div id="makeup-details" role="tabpanel" aria-labelledby="makeup-details-tab" hidden={previewTab}>
          <div className={styles.detailGrid}>
            <button type="button" ref={macroRef} className={styles.macro} aria-label={"Zoom " + product.name} onClick={() => openDialog("zoom")}>
              <span className={styles.media + " fairy-detail-reveal"} key={product.id}><ProductPhoto product={product} closeCrop /></span>
            </button>
            <div className={styles.productCopy}>
              <div aria-live="polite">
                <h2 ref={headingRef} tabIndex={-1}><span key={product.id} className="fairy-selection-label">{product.name}</span></h2>
                <p className={styles.price}>{money(product.priceCents).replace(/\.00$/, "")}</p>
                <p className={styles.description}>{description}</p>
              </div>
              {isLipstick && (
                <>
                  <dl className={styles.shade}><dt>Shade</dt><dd aria-live="polite">{shade.name}</dd></dl>
                  <div className={styles.swatches} role="group" aria-label="Lipstick shades">
                    {lipstickShades.map((option) => (
                      <button type="button" key={option.id} aria-label={option.name} title={option.name}
                        aria-pressed={shade.id === option.id} style={{ "--swatch": option.hex } as CSSProperties}
                        onClick={() => { updateBeautyLook((current) => ({ ...current, lipstickShadeId: option.id })); setStatus(""); }} />
                    ))}
                  </div>
                  {shade.id !== defaultShade.id && (
                    <p className={styles.shadeNote}>Photo shows Soft Mocha. {hasAnotherLipstick
                      ? "Add this shade to replace the lipstick in your preview."
                      : "Your shade appears in the model preview."}</p>
                  )}
                </>
              )}
              {panControls}
              <button className={styles.add} type="button" disabled={!ready} onClick={addToLook}>Add to look</button>
              <button className={styles.more} type="button" onClick={() => openDialog("details")}>Product details <Icon name="arrow" /></button>
              <p className={styles.status} role="status">{status}</p>
            </div>
          </div>
        </div>

        <div id="makeup-preview" role={previewTab ? "tabpanel" : undefined} aria-labelledby={previewTab ? "makeup-preview-tab" : undefined}>
          <EditSummary look={look} effects={effects} selectedId={selectedId} set={set} />
          {previewTab && panControls}
          {previewTab && <p className={styles.previewNote}>Simulated lipstick, blush, and eyeshadow on the sample model. Actual shades may vary with lighting and skin tone.</p>}
        </div>
      </div>

      {!previewTab && (
        <SceneConnector key={product.id} itemId={product.id} layoutRef={layoutRef} photoRef={sceneRef} macroRef={macroRef}
          anchor={isOriginalScene && isLipstick ? lipstickAnchor : undefined} />
      )}

      <dialog ref={dialog} className={styles.dialog} aria-labelledby="makeup-dialog-title" onClose={() => setDialogMode(null)}>
        <div className={styles.dialogHeader}>
          <h2 id="makeup-dialog-title">{product.name}</h2>
          <button type="button" aria-label="Close product preview" onClick={() => dialog.current?.close()}><Icon name="close" /></button>
        </div>
        {dialogMode && <div className={styles.dialogPhoto}><ProductPhoto product={product} /></div>}
        {dialogMode === "details" && (
          <div className={styles.dialogDetails}>
            <p>{money(product.priceCents)} · Demo product · {product.sku}</p>
            <p>{description}</p>
            {isLipstick && <p>Selected shade is {shade.name}. The product photo shows Soft Mocha.</p>}
            <Link className={styles.studioButton} href={productHref(product.id)} onClick={() => dialog.current?.close()}>Open product page</Link>
          </div>
        )}
      </dialog>
    </div>
  );
}

