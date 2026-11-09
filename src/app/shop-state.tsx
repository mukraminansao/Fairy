"use client";

import { useState, useSyncExternalStore } from "react";
import { catalogLine, products, type Product } from "./catalog";
import { readContourPlacement } from "./contour-zones";
import { readContourSketch } from "./contour-sketch";
import { defaultPendant, type PendantColor } from "./fashion-data";
import { beautyFinishes, defaultBeautyLook, getEyeshadowShade, getLipstickShade, lipstickId, lipstickVariantKey, readProductPans, type BeautyLook } from "./makeup-data";
import { beautySets, fashionSets } from "./look-sets";
import { BagButton } from "./bag-button";
import styles from "./shop.module.css";

const storageKey = "fairy.homepage-shop";
const changeEvent = "fairy-shop-change";
const empty = JSON.stringify({ bag: {}, saved: [] });
const validIds = new Set(products.map(({ id }) => id));

export type FashionLook = { ids: string[]; pendantColor: PendantColor };
type SavedOutfit = { number: number; look: FashionLook };
type ShopState = {
  bag: Record<string, number>;
  saved: string[];
  fashionLook?: FashionLook;
  previousFashionLook?: FashionLook;
  savedOutfits?: SavedOutfit[];
  beautyLook?: BeautyLook;
  previousBeautyLook?: BeautyLook;
  savedBeautyLook?: BeautyLook;
};
const beautyIds = new Set(beautySets.flatMap(({ itemIds }) => itemIds));
const fashionIds = new Set(fashionSets.flatMap(({ itemIds }) => itemIds));
let inMemory: string | undefined;

function subscribe(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener(changeEvent, update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener(changeEvent, update);
  };
}

function snapshot() {
  try {
    return inMemory ?? localStorage.getItem(storageKey) ?? empty;
  } catch {
    return inMemory ?? empty;
  }
}

function readBeautyLook(value?: BeautyLook): BeautyLook | undefined {
  if (!Array.isArray(value?.ids)) return undefined;
  const intensities = Object.fromEntries(Object.entries(value.intensities ?? {}).filter(([id, amount]) =>
    beautyIds.has(id) && Number.isInteger(amount) && amount >= 0 && amount <= 100,
  ));
  const finishes = Object.fromEntries(Object.entries(value.finishes ?? {}).filter(([id, finish]) =>
    beautyIds.has(id) && finish !== undefined && beautyFinishes.includes(finish),
  ));
  return {
    ids: [...new Set(value.ids.filter((id) => beautyIds.has(id)))],
    lipstickShadeId: getLipstickShade(value.lipstickShadeId).id,
    eyeshadowShadeId: getEyeshadowShade(value.eyeshadowShadeId).id,
    contourPlacement: readContourPlacement(value.contourPlacement),
    contourSketch: readContourSketch(value.contourSketch),
    productPanIds: readProductPans(value.productPanIds),
    intensities,
    finishes,
  };
}

export function bagLine(key: string) {
  const line = catalogLine(key);
  return line && {
    id: line.product.id, product: line.product, variant: line.variant.name,
    stock: line.variant.stock, hasVariant: key !== line.product.id,
  };
}

function readFashionLook(value?: FashionLook): FashionLook | undefined {
  if (!Array.isArray(value?.ids)) return undefined;
  return {
    ids: [...new Set(value.ids.filter((id) => fashionIds.has(id)))],
    pendantColor: value.pendantColor === "silver" ? "silver" : "black",
  };
}

function parse(raw: string): ShopState {
  try {
    const value = JSON.parse(raw);
    const bag = Object.fromEntries(
      Object.entries(value.bag ?? {}).filter(([key, count]) =>
        bagLine(key) && typeof count === "number" && Number.isSafeInteger(count) && count > 0 && count <= 99,
      ),
    ) as ShopState["bag"];
    const saved = Array.isArray(value.saved)
      ? [...new Set<string>(value.saved.filter((id: string) => validIds.has(id)))]
      : [];
    const savedOutfits = Array.isArray(value.savedOutfits) ? value.savedOutfits.flatMap((entry: SavedOutfit) => {
      const look = readFashionLook(entry?.look);
      return look?.ids.length && Number.isSafeInteger(entry.number) && entry.number > 0 ? [{ number: entry.number, look }] : [];
    }) : undefined;
    return {
      bag, saved, savedOutfits, fashionLook: readFashionLook(value.fashionLook),
      previousFashionLook: readFashionLook(value.previousFashionLook),
      beautyLook: readBeautyLook(value.beautyLook), previousBeautyLook: readBeautyLook(value.previousBeautyLook),
      savedBeautyLook: readBeautyLook(value.savedBeautyLook),
    };
  } catch {
    return { bag: {}, saved: [] };
  }
}

function change<T>(update: (state: ShopState) => T): T {
  const state = parse(snapshot());
  const result = update(state);
  const next = JSON.stringify(state);
  try {
    localStorage.setItem(storageKey, next);
    inMemory = undefined;
  } catch {
    inMemory = next;
  }
  window.dispatchEvent(new Event(changeEvent));
  return result;
}

const emptyShopState = parse(empty);
let lastRead = { raw: empty, state: emptyShopState };

function readShopState() {
  const raw = snapshot();
  if (lastRead.raw !== raw) lastRead = { raw, state: parse(raw) };
  return lastRead.state;
}

export function useShopState() {
  return useSyncExternalStore(subscribe, readShopState, () => emptyShopState);
}

export function changeQuantity(id: string, amount: number) {
  const line = bagLine(id);
  if (!line || !Number.isSafeInteger(amount)) return false;
  return change(({ bag }) => {
    const current = bag[id] ?? 0;
    const quantity = amount > 0 ? Math.min(Math.max(current, line.stock), current + amount) : Math.max(0, current + amount);
    if (quantity > 0) bag[id] = quantity;
    else delete bag[id];
    return quantity !== current;
  });
}

export function removeBagLine(key: string) {
  return change(({ bag }) => {
    const removed = bag[key] ?? 0;
    delete bag[key];
    return removed;
  });
}

export function restoreBagLine(key: string, quantity: number) {
  const line = bagLine(key);
  return Boolean(line && change(({ bag }) => {
    const total = (bag[key] ?? 0) + quantity;
    if (total > line.stock) return false;
    bag[key] = total;
    return true;
  }));
}

export function replaceBagOption(from: string, to: string) {
  const source = bagLine(from);
  const target = bagLine(to);
  if (!source || !target || source.id !== target.id || from === to) return false;
  return change(({ bag }) => {
    const total = (bag[from] ?? 0) + (bag[to] ?? 0);
    if (!bag[from] || total > target.stock) return false;
    bag[to] = total;
    delete bag[from];
    return true;
  });
}

export function addBagItems(keys: string[]) {
  const selected = [...new Set(keys)];
  return change(({ bag }) => {
    const unavailable = selected.some((key) => {
      const line = bagLine(key);
      return !line || (bag[key] ?? 0) >= line.stock;
    });
    if (unavailable) return [];
    for (const key of selected) bag[key] = (bag[key] ?? 0) + 1;
    return selected;
  });
}

export function beautyBagKeys(look: BeautyLook) {
  const shade = getLipstickShade(look.lipstickShadeId);
  return look.ids.filter((id) => beautyIds.has(id)).map((id) =>
    id === lipstickId ? lipstickVariantKey(shade.id) : id,
  );
}

export function fashionBagKeys(look: FashionLook) {
  return look.ids.filter((id) => fashionIds.has(id)).map((id) =>
    id === defaultPendant && look.pendantColor === "silver" ? id + ":silver" : id,
  );
}

export function updateFashionLook(initial: FashionLook, update: (look: FashionLook) => FashionLook) {
  change((state) => {
    const before = state.fashionLook ?? initial;
    const next = update(before);
    if (JSON.stringify(next) !== JSON.stringify(before)) state.previousFashionLook = before;
    state.fashionLook = next;
  });
}

export function undoFashionEdit() {
  return change((state) => {
    if (!state.previousFashionLook) return false;
    state.fashionLook = state.previousFashionLook;
    state.previousFashionLook = undefined;
    return true;
  });
}

export function saveOutfit(look: FashionLook) {
  let result = { number: 0, saved: false };
  change((state) => {
    const outfits = state.savedOutfits ?? [];
    const existing = outfits.find(({ look: saved }) =>
      saved.ids.length === look.ids.length && saved.ids.every((id) => look.ids.includes(id)) &&
      (!look.ids.includes(defaultPendant) || saved.pendantColor === look.pendantColor),
    );
    if (existing) {
      result = { number: existing.number, saved: false };
      return;
    }
    const number = Math.max(0, ...outfits.map((outfit) => outfit.number)) + 1;
    state.savedOutfits = [{ number, look }, ...outfits];
    result = { number, saved: true };
  });
  return result;
}

export function removeSavedOutfit(number: number) {
  change((state) => { state.savedOutfits = state.savedOutfits?.filter((outfit) => outfit.number !== number); });
}

export function updateBeautyLook(update: (look: BeautyLook) => BeautyLook, initial = defaultBeautyLook) {
  change((state) => {
    const before = state.beautyLook ?? initial;
    const next = update(before);
    if (JSON.stringify(next) !== JSON.stringify(before)) state.previousBeautyLook = before;
    state.beautyLook = next;
  });
}

export function undoBeautyEdit() {
  return change((state) => {
    if (!state.previousBeautyLook) return false;
    state.beautyLook = state.previousBeautyLook;
    state.previousBeautyLook = undefined;
    return true;
  });
}

export function saveBeautyLook(look: BeautyLook) {
  change((state) => { state.savedBeautyLook = look; });
}

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function useClientReady() {
  return useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
}

export function ProductActions({ product, variantKey = product.id, card = false, mobileLabel }: {
  product: Product; variantKey?: string; card?: boolean; mobileLabel?: string;
}) {
  const ready = useClientReady();
  const quantity = useSyncExternalStore(subscribe, () => readShopState().bag[variantKey] ?? 0, () => 0);
  const [confirmation, setConfirmation] = useState(0);
  const stock = bagLine(variantKey)?.stock ?? 0;
  const atLimit = ready && quantity >= stock;
  const confirmed = confirmation > 0 && quantity > 0;
  const status = confirmed ? "Added to bag · Qty " + quantity : atLimit ? "Demo stock limit reached." : "";

  return (
    <div className={styles.productActions} data-card={card || undefined}>
      <div className={styles.actionButtons} role="group" aria-label={product.name + " shopping actions"}>
        <BagButton disabled={!ready || atLimit} confirmation={confirmed ? confirmation : undefined} mobileLabel={mobileLabel}
          mobileStatus={status} onAdd={() => {
            if (changeQuantity(variantKey, 1)) setConfirmation((value) => value + 1);
          }} />
      </div>
      <span role="status" className={styles.actionStatus} data-confirmed={confirmed || undefined}>{status}</span>
    </div>
  );
}
