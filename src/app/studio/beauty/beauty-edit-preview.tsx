"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { emptyContour, maxStrokes, type ContourSketch } from "../../contour-sketch";
import { money, productHref, type Product } from "../../catalog";
import { beautySets, getLookProduct, setProductHref } from "../../look-sets";
import { FacePreview, modelTones, type ModelTone } from "../../looks/soft-rose-edit/face-preview";
import { PaletteShades } from "../../looks/soft-rose-edit/palette-shades";
import {
  addBeautyPiece, beautyArea, beautyFinishes, beautyIntensity, eyeshadowId, getBeautyEffects, getLipstickShade, getProductPan, tryOnPalette,
  lipstickId, lipstickShades, makeupHref, studioBeautyLook, type BeautyArea, type BeautyLook,
} from "../../makeup-data";
import { MobilePreview } from "../mobile-preview";
import { LookReview } from "../../look-review";
import { bagLine, beautyBagKeys, saveBeautyLook, undoBeautyEdit, updateBeautyLook, useClientReady, useShopState } from "../../shop-state";
import { Icon } from "../../ui-icon";
import { CameraCanvas } from "./camera-canvas";
import { SelfieCanvas } from "./selfie-canvas";
import { ContourTools } from "./contour-tools";
import { productShade, ShadeComparison, withShade, type ShadeChoice } from "./shade-comparison";
import styles from "./beauty-studio.module.css";

const products = beautySets.flatMap((set) => set.itemIds.map(getLookProduct));
const areas: BeautyArea[] = ["lips", "cheeks", "eyes", "skin", "brows", "lashes", "contour", "eyeliner"];
const areaLabel = (area: BeautyArea) => area === "eyes" ? "Eyeshadow" : area;
const zoomLevels = [100, 125, 150];

function studioPrice(cents: number) {
  return money(cents).replace(/\.00$/, "");
}

function ProductThumb({ product }: { product: Product }) {
  const isLipstick = product.id === lipstickId;
  return (
    <span className={styles.thumb} data-lipstick={isLipstick || undefined}>
      <Image src={product.previewImage} alt="" fill sizes={isLipstick ? "360px" : "(max-width: 640px) 120px, 165px"} />
    </span>
  );
}

function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission was not granted.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No available camera was found.";
  if (name === "NotReadableError" || name === "AbortError") return "The camera is busy or unavailable. Close other apps using it and try again.";
  return "Live preview couldn’t start.";
}

function StudioCanvas({ look, cameraEnabled, contourSelected, onModelSketchChange, shadeChoice, choosePreviewProduct, onApplyComparison }: {
  look: BeautyLook; cameraEnabled: boolean; contourSelected: boolean; shadeChoice?: ShadeChoice;
  choosePreviewProduct: { selected?: string; onSelect: (id: string) => void };
  onApplyComparison: (productId: string, shadeId?: string) => void;
  onModelSketchChange: (update: (sketch: ContourSketch) => ContourSketch) => void;
}) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [modelTone, setModelTone] = useState<ModelTone>("medium");
  const modelReady = useClientReady();
  const [compare, setCompare] = useState(true);
  const [camera, setCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [photo, setPhoto] = useState<{ file: File; version: number }>();
  const [showMakeup, setShowMakeup] = useState(true);
  const [message, setMessage] = useState("");
  const [cameraHelp, setCameraHelp] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState("");
  const [studioAddress, setStudioAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [drawingContour, setDrawingContour] = useState(false);
  const [brushSize, setBrushSize] = useState(7);
  const cameraConsent = useRef<HTMLDialogElement>(null);
  const cameraButton = useRef<HTMLButtonElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream>(null);
  const requestId = useRef(0);
  const photoVersion = useRef(0);
  const effects = getBeautyEffects(look);
  const personalPreview = camera || Boolean(photo);
  const modelContour = contourSelected && Boolean(effects.contourColor);
  const drawing = modelContour && drawingContour;
  const sketch = look.contourSketch ?? emptyContour;
  const zoom = zoomLevels[zoomIndex];

  const release = useCallback(() => {
    requestId.current++;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopCamera = useCallback((status: string) => {
    release();
    setCamera(false);
    setStream(undefined);
    setMessage(status);
  }, [release]);

  const previewPhoto = useCallback((file: File) => {
    stopCamera("");
    setCameraHelp(false);
    setShowMakeup(true);
    setPhoto({ file, version: ++photoVersion.current });
  }, [stopCamera]);

  useEffect(() => () => release(), [release]);
  useEffect(() => {
    if (!camera) return;
    function leave() { stopCamera("Camera stopped when you left the preview."); }
    function onVisibility() { if (document.visibilityState === "hidden") leave(); }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
    };
  }, [camera, stopCamera]);

  function startCamera(deviceId?: string) {
    cameraConsent.current?.close();
    cameraButton.current?.focus();
    const showFailure = (status: string) => {
      stopCamera(status);
      setCameraHelp(true);
      setStudioAddress(window.location.href);
      setCopied(false);
    };
    const doc = document as Document & { featurePolicy?: { allowsFeature(name: string): boolean }; permissionsPolicy?: { allowsFeature(name: string): boolean } };
    const policy = doc.permissionsPolicy ?? doc.featurePolicy;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || policy?.allowsFeature("camera") === false) {
      showFailure("This browser view doesn’t allow camera access.");
      return;
    }
    release();
    const request = requestId.current;
    setMessage("");
    setCameraHelp(false);
    setShowMakeup(true);
    setCamera(true);
    setStream(undefined);

    // Keep the first request in the user's click, then retry without device preferences only if necessary.
    const media = navigator.mediaDevices;
    const preferred: MediaTrackConstraints = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "user" } };
    void media.getUserMedia({ audio: false, video: preferred }).catch((error: unknown) => {
      if (request !== requestId.current || !(error instanceof Error) ||
          !["NotFoundError", "OverconstrainedError"].includes(error.name)) throw error;
      return media.getUserMedia({ audio: false, video: true });
    }).then((input) => {
      if (request !== requestId.current) { input.getTracks().forEach((track) => track.stop()); return; }
      const track = input.getVideoTracks().find((candidate) => candidate.readyState === "live");
      if (!track) {
        input.getTracks().forEach((candidate) => candidate.stop());
        showFailure("No available camera was found.");
        return;
      }
      setPhoto(undefined);
      streamRef.current = input;
      setStream(input);
      setDevice(track.getSettings().deviceId ?? deviceId ?? "");
      void media.enumerateDevices?.().then((entries) => {
        if (request === requestId.current) setDevices(entries.filter(({ kind, deviceId }) => kind === "videoinput" && deviceId));
      }).catch(() => {});
    }).catch((error: unknown) => {
      if (request === requestId.current) showFailure(cameraError(error));
    });
  }

  const comparison = <ShadeComparison activeProductId={choosePreviewProduct.selected}
    look={look} modelTone={modelTone} disabled={!modelReady} onApply={onApplyComparison} />;

  return (
    <section id="beauty-preview" className={styles.canvas} aria-label={camera ? "Live beauty preview" : photo ? "Selfie beauty preview" : "Beauty model preview"}>
      <div className={styles.toolbar}>
        <span className={styles.modelMode}>{camera ? "Live camera" : photo ? "Selfie preview" : "Model preview"}</span>
        {!camera && <button type="button" disabled={!cameraEnabled} aria-describedby="studio-mode-note"
          onClick={() => photoInput.current?.click()}><Icon name="upload" /> {photo ? "Choose another selfie" : "Upload selfie"}</button>}
        <input ref={photoInput} type="file" hidden aria-label="Choose selfie photo" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) previewPhoto(file);
          }} />
        <button ref={cameraButton} type="button" disabled={!cameraEnabled}
          aria-haspopup={cameraEnabled && !camera ? "dialog" : undefined}
          aria-describedby={cameraEnabled ? undefined : "studio-mode-note"}
          onClick={() => camera ? stopCamera("Camera stopped. The model preview is back.") : cameraConsent.current?.showModal()}>
          <Icon name="camera" /> {camera ? "Stop camera" : "Use camera"}
        </button>
        {!personalPreview && <div className={styles.zoom} role="group" aria-label="Model zoom">
          <span aria-live="polite">Zoom {zoom}%</span>
          <div className={styles.zoomButtons}>
            <button type="button" aria-label="Zoom out" disabled={zoomIndex === 0}
              onClick={() => setZoomIndex(zoomIndex - 1)}><Icon name="zoomOut" /></button>
            <button type="button" aria-label="Zoom in" disabled={zoomIndex === zoomLevels.length - 1}
              onClick={() => setZoomIndex(zoomIndex + 1)}><Icon name="zoomIn" /></button>
          </div>
        </div>}
      </div>
      {message && <p className={styles.cameraStatus} role="status">{message}</p>}
      {cameraHelp && <div className={styles.cameraHelp}>
        <p>In the preview panel, camera access can be blocked. Open this address in Chrome or Edge, then choose <strong>Allow</strong> in the browser’s camera settings.</p>
        <div className={styles.cameraLink}>
          <input aria-label="Beauty Studio address" readOnly value={studioAddress} onFocus={(event) => event.currentTarget.select()} />
          <button type="button" onClick={() => {
            if (navigator.clipboard) void navigator.clipboard.writeText(studioAddress).then(() => setCopied(true)).catch(() => {});
          }}>{copied ? "Copied" : "Copy address"}</button>
        </div>
        <p>Check that your device allows camera access for this browser, then retry.</p>
        <div className={styles.cameraActions}>
          <button type="button" onClick={() => {
            stopCamera("Sample model ready.");
            setPhoto(undefined);
            setCameraHelp(false);
          }}>Use sample model</button>
          <button type="button" onClick={() => photoInput.current?.click()}>Upload selfie instead</button>
          <button type="button" onClick={() => cameraConsent.current?.showModal()}>Retry camera</button>
        </div>
      </div>}
      {camera && stream && devices.length > 1 && <label className={styles.cameraSelect}>Camera
        <select value={device} onChange={(event) => startCamera(event.currentTarget.value)}>
          {!device && <option value="">Current camera</option>}
          {devices.map(({ deviceId, label }, index) => <option key={deviceId} value={deviceId}>{label || "Camera " + (index + 1)}</option>)}
        </select>
      </label>}
      {personalPreview ? <>
        {camera ? (stream ? <CameraCanvas stream={stream} effects={effects} showMakeup={showMakeup} onExit={stopCamera} onCapture={previewPhoto} /> :
          <p className={styles.cameraStatus} data-loading role="status">Opening camera… Allow access if your browser asks.</p>) :
          photo && <SelfieCanvas key={photo.version} file={photo.file} effects={effects} showMakeup={showMakeup}
            onShowMakeup={() => setShowMakeup(true)} contourSelected={contourSelected} />}
        {camera && contourSelected && <p className={styles.brushPrivacy}>Choose Take photo to draw contour on a still frame.</p>}
        <div className={styles.canvasFooter}>
          <button className={styles.compare} type="button" role="switch" aria-checked={showMakeup} onClick={() => setShowMakeup(!showMakeup)}>
            <span aria-hidden="true" /> Show makeup
          </button>
          {photo && <button type="button" className={styles.compare} onClick={() => {
            setPhoto(undefined); setMessage("Selfie removed. The model preview is back.");
          }}>Remove selfie</button>}
          {comparison}
        </div>
      </> : <>
        {modelContour && <ContourTools sketch={sketch} size={brushSize} drawing={drawing}
          onToggle={() => setDrawingContour(!drawing)} onSize={setBrushSize} onChange={onModelSketchChange} />}
        <MobilePreview title="Makeup preview"
          preview={<FacePreview {...effects} studio modelTone={modelTone} compare={false} shadePreview portrait />}>
          {look.ids.length > 0 && <label>Product
            <select value={choosePreviewProduct.selected} onChange={(event) => choosePreviewProduct.onSelect(event.currentTarget.value)}>
              {look.ids.map((id) => <option key={id} value={id}>{getLookProduct(id).name}</option>)}
            </select>
          </label>}
          {shadeChoice && <label>Shade
            <select value={shadeChoice.currentId} onChange={(event) => shadeChoice.onSelect(event.currentTarget.value)}>
              {shadeChoice.options.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>}
        </MobilePreview>
        <FacePreview {...effects} studio modelTone={modelTone} zoom={zoom} compare={compare && !drawing} previewOrigin
          brush={drawing ? { size: brushSize, onStroke: (stroke) => onModelSketchChange((current) => current.strokes.length < maxStrokes
            ? { ...current, strokes: [...current.strokes, stroke] } : current) } : undefined} />
        <div className={styles.canvasFooter}>
          <button className={styles.compare} type="button" role="switch" aria-checked={compare && !drawing} disabled={drawing}
            onClick={() => setCompare(!compare)}><span aria-hidden="true" /> Compare before/after</button>
          <div className={styles.modelTools}>
            <label>Sample tone
              <select value={modelTone} disabled={!modelReady} onChange={(event) => setModelTone(event.currentTarget.value as ModelTone)}>
                {modelTones.map((tone) => <option key={tone} value={tone}>{tone[0].toUpperCase() + tone.slice(1)}</option>)}
              </select>
            </label>
            {comparison}
          </div>
        </div>
      </>}

      {cameraEnabled && <dialog ref={cameraConsent} className={styles.picker + " " + styles.cameraConsent} data-motion-dialog
        aria-labelledby="camera-consent-heading" aria-describedby="camera-consent-copy">
        <div className={styles.pickerHeader}>
          <h2 id="camera-consent-heading">Try makeup on camera</h2>
        </div>
        <p id="camera-consent-copy">Your browser uses the camera to place the makeup on your face. Video and face points stay on this device and aren’t saved or uploaded. The microphone stays off.</p>
        <p>You can stop at any time and return to the sample model.</p>
        <div className={styles.cameraActions}>
          <button type="button" onClick={() => cameraConsent.current?.close()}>Keep model preview</button>
          <button type="button" onClick={() => startCamera()}>Start camera</button>
        </div>
      </dialog>}
    </section>
  );
}

export function BeautyEditPreview({ initialId, initialShade, cameraEnabled, returnLink }: {
  initialId?: string; initialShade?: string; cameraEnabled: boolean; returnLink: { href: string; title: string };
}) {
  const [selectedId, setSelectedId] = useState(initialId ?? lipstickId);
  const [filter, setFilter] = useState<BeautyArea>();
  const [setFilterId, setSetFilterId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [addedSummary, setAddedSummary] = useState<string[]>([]);
  const [resetVersion, setResetVersion] = useState(0);
  const picker = useRef<HTMLDialogElement>(null);
  const customizeHeading = useRef<HTMLHeadingElement>(null);
  const ready = useClientReady();
  const { beautyLook, previousBeautyLook, savedBeautyLook } = useShopState();
  const look = beautyLook ?? studioBeautyLook;
  const items = look.ids.map(getLookProduct);
  const active = items.find(({ id }) => id === selectedId) ?? items[0];
  const activeArea = active && beautyArea(active.id);
  const palette = active && tryOnPalette(active.id);
  const shade = getLipstickShade(look.lipstickShadeId);
  const subtotal = items.reduce((sum, product) => sum + product.priceCents, 0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSet = beautySets.find(({ id }) => id === setFilterId);
  const available = products.filter(({ id, name }) =>
    (!filteredSet || filteredSet.itemIds.includes(id)) &&
    !look.ids.includes(id) && (!filter || beautyArea(id) === filter) && name.toLowerCase().includes(normalizedQuery),
  );

  useEffect(() => {
    if (!initialShade) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("item") !== lipstickId || url.searchParams.get("shade") !== initialShade) return;
    updateBeautyLook((current) => ({
      ...current, ids: addBeautyPiece(current.ids, lipstickId), lipstickShadeId: initialShade,
    }), studioBeautyLook);
    // Consume the request so returning or refreshing keeps subsequent edits.
    url.searchParams.delete("shade");
    window.history.replaceState(window.history.state, "", url);
  }, [initialShade]);

  function edit(update: (current: BeautyLook) => BeautyLook) {
    updateBeautyLook(update, studioBeautyLook);
    setAddedSummary([]);
    setStatus("");
  }

  const shadeOptions = active?.id === lipstickId ? lipstickShades : palette;
  const selectedShade = active && productShade(look, active.id);
  const shadeChoice = active && selectedShade && shadeOptions && shadeOptions.length > 1 ? {
    options: shadeOptions, currentId: selectedShade.id,
    onSelect: (id: string) => edit((current) => withShade(current, active.id, id)),
  } : undefined;

  function applyComparison(productId: string, shadeId?: string) {
    edit((current) => {
      const next = { ...current, ids: addBeautyPiece(current.ids, productId) };
      return shadeId ? withShade(next, productId, shadeId) : next;
    });
    setSelectedId(productId);
    setStatus(getLookProduct(productId).name + " applied.");
  }

  function select(id: string) {
    setSelectedId(id);
    setStatus("");
    if (window.matchMedia("(max-width: 760px)").matches) {
      requestAnimationFrame(() => customizeHeading.current?.focus());
    }
  }

  function openPicker(area?: BeautyArea) {
    setFilter(area); setSetFilterId("");
    setQuery("");
    picker.current?.showModal();
  }

  function chooseArea(area: BeautyArea) {
    const item = items.find(({ id }) => beautyArea(id) === area);
    if (item) select(item.id);
    else openPicker(area);
  }

  return (
    <>
      <div className={styles.workspace}>
        <StudioCanvas key={resetVersion} look={look} cameraEnabled={cameraEnabled} contourSelected={activeArea === "contour"}
          shadeChoice={shadeChoice} choosePreviewProduct={{ selected: active?.id, onSelect: setSelectedId }}
          onApplyComparison={applyComparison}
          onModelSketchChange={(update) => edit((current) => ({ ...current, contourSketch: update(current.contourSketch ?? emptyContour) }))} />
        <section className={styles.makeupBag} aria-labelledby="makeup-bag-heading">
          <h2 id="makeup-bag-heading">Your makeup bag</h2>
          {items.length ? (
            <ul className={styles.bagList} aria-label="Products in your beauty edit">
              {items.map((product) => {
                const selected = active?.id === product.id;
                const label = product.id === lipstickId ? shade.name + " Lipstick" : product.name;
                return (
                  <li key={product.id} data-selected={selected || undefined}>
                    <ProductThumb product={product} />
                    <div>
                      <span>{label}</span>
                      <p>{studioPrice(product.priceCents)}</p>
                    </div>
                    <button className={styles.chooseProduct} type="button" aria-label={"Customize " + label}
                      aria-pressed={selected} onClick={() => select(product.id)} />
                    <button type="button" className={styles.remove} aria-label={"Remove " + product.name} disabled={!ready}
                      onClick={() => edit((current) => ({ ...current, ids: current.ids.filter((id) => id !== product.id) }))}>Remove</button>
                  </li>
                );
              })}
            </ul>
          ) : <p className={styles.empty}>Add a product to start your beauty edit.</p>}
          <button className={styles.addProduct} type="button" onClick={() => openPicker()}><Icon name="plus" /> Add another product</button>
          <div className={styles.areas}>
            <h3>Areas to style</h3>
            <div role="group" aria-label="Areas to style">
              {areas.map((area) => <button type="button" key={area} aria-pressed={activeArea === area} onClick={() => chooseArea(area)}>{areaLabel(area)}</button>)}
            </div>
          </div>
        </section>

        <section className={styles.customize} aria-labelledby="customize-heading">
          <h2 id="customize-heading" ref={customizeHeading} tabIndex={-1}>Customize your look</h2>
          {active ? (
            <>
              <div className={styles.product}>
                <ProductThumb product={active} />
                <div className={styles.productInfo}>
                  <h3>{active.name}</h3>
                  {active.id === lipstickId && (
                    <>
                      <p className={styles.shade}>Shade <span aria-hidden="true">·</span> <strong aria-live="polite">{shade.name}</strong></p>
                      <div className={styles.swatches} role="group" aria-label="Lipstick shades">
                        {lipstickShades.map((option) => (
                          <button type="button" key={option.id} title={option.name} aria-label={option.name}
                            aria-pressed={option.id === shade.id} disabled={!ready} style={{ "--swatch": option.hex } as CSSProperties}
                            onClick={() => edit((current) => ({ ...current, lipstickShadeId: option.id }))} />
                        ))}
                      </div>
                    </>
                  )}
                  {palette && (
                    <PaletteShades palette={palette} label={activeArea === "contour" ? "Contour palette shades" : undefined}
                      selectedId={getProductPan(active.id, active.id === eyeshadowId ? look.eyeshadowShadeId : look.productPanIds?.[active.id])?.id ?? ""}
                      onSelect={(id) => edit((current) => active.id === eyeshadowId ? { ...current, eyeshadowShadeId: id } :
                        { ...current, productPanIds: { ...current.productPanIds, [active.id]: id } })} />
                  )}
                  {activeArea === "skin" && (active.id === "b-foundation" || active.id === "b-golden-tint") &&
                    <p className={styles.shade}>Shade <span aria-hidden="true">·</span> {active.id === "b-foundation" ? "Natural Beige" : "Golden Veil"}</p>}
                  {!activeArea && <p className={styles.productNote}>Available in the makeup bag. This product has no model color overlay.</p>}
                </div>
              </div>
              <div className={styles.productLinks}>
                {active.id === lipstickId && <Link className={styles.viewProduct}
                  href={productHref(lipstickId) + "?" + new URLSearchParams({ shade: shade.id })}>View product <Icon name="arrow" /></Link>}
                <Link className={styles.viewProduct} href={setProductHref(makeupHref, beautySets, active.id)}>View set <Icon name="arrow" /></Link>
              </div>
              {activeArea && (
                <div className={styles.intensity}>
                  <label htmlFor="beauty-intensity">Intensity</label>
                  <span aria-hidden="true">{beautyIntensity(look, active.id)}%</span>
                  <input id="beauty-intensity" type="range" min="0" max="100" value={beautyIntensity(look, active.id)}
                    disabled={!ready} style={{ "--level": beautyIntensity(look, active.id) + "%" } as CSSProperties}
                    onChange={(event) => {
                      const amount = event.currentTarget.valueAsNumber;
                      edit((current) => ({ ...current, intensities: { ...current.intensities, [active.id]: amount } }));
                    }} />
                </div>
              )}
              {activeArea === "contour" && <p className={styles.productNote}><a className={styles.brushJump} href="#beauty-preview">Go to face preview</a> to place and blend this shade.</p>}
              {activeArea === "lips" && (
                <div className={styles.finish}>
                  <h3 id="beauty-finish">Finish</h3>
                  <div role="group" aria-labelledby="beauty-finish">
                    {beautyFinishes.map((finish) => <button type="button" key={finish} disabled={!ready}
                      aria-pressed={(look.finishes?.[active.id] ?? "Satin") === finish}
                      onClick={() => edit((current) => ({ ...current, finishes: { ...current.finishes, [active.id]: finish } }))}>{finish}</button>)}
                  </div>
                </div>
              )}
            </>
          ) : <div className={styles.empty}>
            <p>Your makeup bag is empty. Add a product or start with the Soft Rose Edit.</p>
            <button type="button" className={styles.compareShades} disabled={!ready} onClick={() => {
              edit(() => studioBeautyLook);
              setSelectedId(lipstickId);
              setStatus("Soft Rose Edit added.");
            }}>Use Soft Rose starter look</button>
          </div>}
          <div className={styles.actions}>
            <div>
              <button type="button" disabled={!ready} onClick={() => {
                edit(() => studioBeautyLook);
                setSelectedId(lipstickId);
                setResetVersion((version) => version + 1);
                setStatus("Restored the Soft Rose Edit defaults.");
              }}><Icon name="reset" /> Reset look</button>
              <button type="button" disabled={!ready || items.length === 0} onClick={() => {
                saveBeautyLook(look);
                setAddedSummary([]);
                setStatus("Look saved in this browser.");
              }}><Icon name="heart" /> Save this look</button>
            </div>
            {previousBeautyLook && <button type="button" className={styles.restore} onClick={() => {
              if (undoBeautyEdit()) {
                setAddedSummary([]);
                setStatus("Last beauty change undone.");
              }
            }}>Undo beauty change</button>}
            {savedBeautyLook && <button className={styles.restore} type="button" disabled={!ready} onClick={() => {
              edit(() => savedBeautyLook);
              setSelectedId(savedBeautyLook.ids[0] ?? lipstickId);
              setStatus("Saved look loaded.");
            }}>Load saved look</button>}
            <LookReview className={styles.addToBag} keys={beautyBagKeys(look)} disabled={!ready || !items.length}
              labels={Object.fromEntries(look.ids.flatMap((id) => {
                const pan = getProductPan(id, id === eyeshadowId ? look.eyeshadowShadeId : look.productPanIds?.[id]);
                return pan ? [[id, pan.name + " · palette pan"]] : [];
              }))} onAdded={(added) => {
              const count = added.length;
              setAddedSummary(added.flatMap((key) => {
                const line = bagLine(key);
                return line ? [line.product.name + (line.variant ? " · " + line.variant : "")] : [];
              }));
              setStatus(count ? count + (count === 1 ? " product added" : " products added") + " to your demo bag." : "These products are at the bag quantity limit.");
            }}>Review {items.length} {items.length === 1 ? "product" : "products"} · {studioPrice(subtotal)}</LookReview>
            <p className={styles.status} role="status">{status}</p>
            {addedSummary.length > 0 && <ul className={styles.addedSummary} aria-label="Products added to your demo bag">
              {addedSummary.map((item) => <li key={item}>{item}</li>)}
            </ul>}
          </div>
        </section>
      </div>

      <div className={styles.notes}>
        <p>Digital preview; actual shades may vary with lighting and skin tone.</p>
        <p id="studio-mode-note">{cameraEnabled ? "Camera and selfie are optional. Your photo stays on this device. Choose a JPG, PNG, or WebP under 15 MB." : "Choose a sample skin tone and preview shades in the studio."}</p>
        <Link href={returnLink.href}>View {returnLink.title}</Link>
      </div>

      <dialog ref={picker} className={styles.picker} aria-labelledby="beauty-picker-heading" data-motion-dialog>
        <div className={styles.pickerHeader}>
          <h2 id="beauty-picker-heading">Add another product</h2>
          <button type="button" aria-label="Close product picker" onClick={() => picker.current?.close()}><Icon name="close" /></button>
        </div>
        <div className={styles.pickerFilters} role="group" aria-label="Filter products by area">
          <button type="button" aria-pressed={!filter} onClick={() => setFilter(undefined)}>All</button>
          {areas.map((area) => <button type="button" key={area} aria-pressed={area === filter} onClick={() => setFilter(area)}>{areaLabel(area)}</button>)}
        </div>
        <div className={styles.pickerSearch}>
          <label htmlFor="beauty-product-search">Find a product
            <input id="beauty-product-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label htmlFor="beauty-product-set">Beauty set
            <select id="beauty-product-set" value={setFilterId} onChange={(event) => setSetFilterId(event.target.value)}>
              <option value="">All sets ({beautySets.length})</option>
              {beautySets.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
            </select>
          </label>
        </div>
        {available.length ? (
          <ul>
            {available.map((product) => (
              <li key={product.id}>
                <ProductThumb product={product} />
                <div><strong>{product.name}</strong><p>{money(product.priceCents)}</p></div>
                <button type="button" disabled={!ready} aria-label={"Add " + product.name} onClick={() => {
                  edit((current) => ({ ...current, ids: addBeautyPiece(current.ids, product.id) }));
                  picker.current?.close();
                  select(product.id);
                }}>Add</button>
              </li>
            ))}
          </ul>
        ) : <p>No products match. Try another set, area, or search.</p>}
      </dialog>
    </>
  );
}
