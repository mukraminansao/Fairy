"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { money } from "../../catalog";
import { addFashionPiece, defaultFashionLook, defaultPendant, fashionHref, isFashionPieceVisible, pendantFinishes } from "../../fashion-data";
import { fashionSets, getLookProduct, setProductHref } from "../../look-sets";
import { LookReview } from "../../look-review";
import { fashionBagKeys, bagLine, removeSavedOutfit, saveOutfit, undoFashionEdit, updateFashionLook, useClientReady, useShopState } from "../../shop-state";
import { MobilePreview } from "../../studio/mobile-preview";
import { Icon } from "../../ui-icon";
import { OutfitFigure, type OutfitDetail, type OutfitView } from "./outfit-figure";
import styles from "./fashion.module.css";

const wardrobe = [...new Set(fashionSets.flatMap(({ itemIds }) => itemIds))].map(getLookProduct);

export function FittingPreview({ initialLook = defaultFashionLook, returnLink }: {
  initialLook?: typeof defaultFashionLook;
  returnLink?: { href: string; title: string };
}) {
  const [previewPiece, setPreviewPiece] = useState("");
  const [view, setView] = useState<OutfitView>("front");
  const [detail, setDetail] = useState<OutfitDetail>("full");
  const [status, setStatus] = useState("");
  const [addedLines, setAddedLines] = useState<string[]>([]);
  const ready = useClientReady();
  const { fashionLook, previousFashionLook, savedOutfits = [] } = useShopState();
  const look = fashionLook ?? initialLook;
  const items = look.ids.map(getLookProduct);
  const hasSling = look.ids.includes("f-bag");
  const accessories = items.filter(({ id }) => !isFashionPieceVisible(id, look.ids, view === "back"));
  const available = wardrobe.filter(({ id }) => !look.ids.includes(id));
  const subtotal = items.reduce((total, product) => total + product.priceCents, 0);

  function clearConfirmation() {
    setStatus("");
    setAddedLines([]);
  }

  function changePiece(id: string, add: boolean) {
    clearConfirmation();
    updateFashionLook(initialLook, (current) => {
      const ids = add ? addFashionPiece(current.ids, id) : current.ids.filter((itemId) => itemId !== id);
      return { ...current, ids };
    });
  }

  return (
    <section className={styles.fittingPreview} data-standalone={returnLink ? true : undefined} aria-labelledby="fitting-preview-heading">
      <div className={styles.previewFigure}>
        {returnLink && <MobilePreview title="Outfit preview" preview={<OutfitFigure look={look} view={view} />}>
          <label>Piece
            <select value={previewPiece} onChange={(event) => setPreviewPiece(event.currentTarget.value)}>
              <option value="">Choose a piece</option>
              <optgroup label="In your outfit">{items.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</optgroup>
              <optgroup label="Try another piece">{available.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</optgroup>
            </select>
          </label>
          <button type="button" disabled={!previewPiece || !ready} onClick={() => changePiece(previewPiece, !look.ids.includes(previewPiece))}>
            {look.ids.includes(previewPiece) ? "Remove piece" : "Try piece"}
          </button>
          <button type="button" onClick={() => setView(view === "front" ? "back" : "front")}>
            {view === "front" ? "Show back" : "Show front"}
          </button>
        </MobilePreview>}
        <div className={styles.outfitControls}>
          <div className={styles.outfitViews} role="group" aria-label="Mannequin view">
            <button type="button" aria-pressed={view === "front"} onClick={() => setView("front")}>Front view</button>
            <button type="button" aria-pressed={view === "back"} onClick={() => setView("back")}>Back view</button>
          </div>
          <div className={styles.outfitViews} role="group" aria-label="Mannequin detail">
            <button type="button" aria-pressed={detail === "full"} onClick={() => setDetail("full")}>Full look</button>
            <button type="button" aria-pressed={detail === "head"} onClick={() => setDetail("head")}>Head &amp; neck</button>
            <button type="button" aria-pressed={detail === "hands"} onClick={() => setDetail("hands")}>Hands &amp; wrists</button>
          </div>
        </div>
        <div className={styles.fittingMannequin} data-detail={detail} data-preview-origin><OutfitFigure look={look} view={view} detail={detail} /></div>
        {view === "back" && !hasSling && (
          <button className={styles.trySling} type="button" disabled={!ready} onClick={() => changePiece("f-bag", true)}>Try sling bag</button>
        )}
        {accessories.length > 0 && (
          <section className={styles.accessoryTray} aria-labelledby="accessories-heading">
            <h3 id="accessories-heading">Accessories in your look</h3>
            <ul>
              {accessories.map((product) => (
                <li key={product.id}>
                  <Image src={product.previewImage} alt="" width={50} height={50} />
                  <span>{product.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className={styles.fittingContent}>
        <h2 id="fitting-preview-heading">2D outfit preview</h2>
        <p>Add or remove pieces from any set. A dress replaces conflicting separates. Use Head &amp; neck or Hands &amp; wrists for a closer look. The sling bag shows in Back view.</p>
        {items.length ? (
          <ul className={styles.fittingList} aria-label="Pieces in your look">
            {items.map((product) => (
              <li key={product.id}>
                <div className={styles.fittingItem}>
                  <Image src={product.previewImage} alt="" width={44} height={44} />
                  <div>
                    <Link href={setProductHref(fashionHref, fashionSets, product.id)}>{product.name}</Link>
                    {product.id === defaultPendant && <small>{pendantFinishes[look.pendantColor]}</small>}
                  </div>
                </div>
                <span>{money(product.priceCents)}</span>
                <button type="button" disabled={!ready} aria-label={"Remove " + product.name}
                  onClick={() => changePiece(product.id, false)}>Remove</button>
              </li>
            ))}
          </ul>
        ) : <div className={styles.empty}>
          <p>Your look is empty. Add pieces below or start with a curated outfit.</p>
          <button className={styles.outlineButton} type="button" disabled={!ready} onClick={() => {
            updateFashionLook(initialLook, () => initialLook);
            setStatus("Starter outfit added.");
          }}>Use starter outfit</button>
        </div>}
        {returnLink && look.ids.includes(defaultPendant) && (
          <div className={styles.finishPicker} role="group" aria-label="Pendant finish">
            <span aria-hidden="true">Pendant finish</span>
            {(["black", "silver"] as const).map((color) => (
              <button key={color} type="button" disabled={!ready} aria-label={"Use " + pendantFinishes[color].toLowerCase()}
                aria-pressed={look.pendantColor === color} onClick={() => {
                  clearConfirmation();
                  updateFashionLook(initialLook, (current) => ({ ...current, pendantColor: color }));
                }}>{color === "black" ? "Black" : "Silver"}</button>
            ))}
          </div>
        )}
        <p className={styles.lookSubtotal} aria-live="polite">Demo subtotal <strong>{money(subtotal)}</strong></p>
        {returnLink && (
          <>
            <div className={styles.fittingActions}>
              <button className={styles.outlineButton} type="button" disabled={!ready || !items.length} onClick={() => {
                setAddedLines([]);
                const result = saveOutfit(look);
                setStatus("Outfit " + result.number + (result.saved ? " saved in this browser." : " is already saved."));
              }}><Icon name="heart" /> Save outfit</button>
              <LookReview className={styles.addButton} keys={fashionBagKeys(look)} disabled={!ready || !items.length} onAdded={(lines) => {
                setAddedLines(lines);
                setStatus(lines.length
                  ? lines.length + (lines.length === 1 ? " piece added" : " pieces added") + " to your demo bag."
                  : "These pieces are at the bag quantity limit.");
              }}>Review outfit</LookReview>
            </div>
            {previousFashionLook && <button type="button" className={styles.outlineButton} onClick={() => {
              if (undoFashionEdit()) { setAddedLines([]); setStatus("Last outfit change undone."); }
            }}>Undo outfit change</button>}
            <p className={styles.fittingStatus} role="status">{status}</p>
            {addedLines.length > 0 && (
              <ul className={styles.addedOutfit} aria-label="Pieces added to your demo bag">
                {addedLines.map((key) => {
                  const line = bagLine(key)!;
                  return <li key={key}>{getLookProduct(line.id).name}{line.variant && " · " + line.variant}</li>;
                })}
              </ul>
            )}
            {savedOutfits.length > 0 && (
              <details className={styles.availablePieces}>
                <summary>Saved outfits ({savedOutfits.length})</summary>
                <ul className={styles.fittingList} aria-label="Saved outfits">
                  {savedOutfits.map(({ number, look: saved }) => (
                    <li key={number}>
                      <div>
                        <strong>Outfit {number}</strong>
                        <small>{saved.ids.map((id) => getLookProduct(id).name).join(" · ")}</small>
                        {saved.ids.includes(defaultPendant) && <small>{pendantFinishes[saved.pendantColor]}</small>}
                      </div>
                      <button type="button" disabled={!ready} aria-label={"Load outfit " + number} onClick={() => {
                        updateFashionLook(initialLook, () => saved);
                        setAddedLines([]);
                        setStatus("Outfit " + number + " loaded.");
                      }}>Load</button>
                      <button type="button" disabled={!ready} aria-label={"Remove saved outfit " + number} onClick={() => {
                        removeSavedOutfit(number);
                        setAddedLines([]);
                        setStatus("Outfit " + number + " removed from saved outfits.");
                      }}>Remove</button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
        {available.length > 0 && (
          <details className={styles.availablePieces}>
            <summary>Add pieces</summary>
            <ul className={styles.fittingList} aria-label="Available pieces">
              {available.map((product) => (
                <li key={product.id}>
                  <span>{product.name}</span>
                  <span>{money(product.priceCents)}</span>
                  <button type="button" disabled={!ready} aria-label={"Add " + product.name}
                    onClick={() => changePiece(product.id, true)}>Add</button>
                </li>
              ))}
            </ul>
          </details>
        )}
        {returnLink && <Link href={returnLink.href} className={styles.outlineButton}>View {returnLink.title}</Link>}
      </div>
    </section>
  );
}
