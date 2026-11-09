"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { formatPrice } from "../catalog";
import { useRouter } from "next/navigation";
import { defaultFashionLook, defaultPendant } from "../fashion-data";
import { readContourPlacement, type ContourPlacement } from "../contour-zones";
import { readContourSketch, type ContourSketch } from "../contour-sketch";
import { beautyArea, beautyFinishes, defaultBeautyLook, getEyeshadowShade, getLipstickShade, defaultShade, lipstickId, tryOnPalette } from "../makeup-data";
import { bagLine, updateBeautyLook, updateFashionLook, useShopState } from "../shop-state";
import { beautySets, fashionSets } from "../look-sets";
import { BagOption } from "../bag-option";
import { accountRequest } from "./client-api";
import styles from "./account.module.css";

type Cart = { currency: string; subtotalMinor: number; items: {
  variantId: string; productName: string; variantName: string; quantity: number; lineTotalMinor: number; available: boolean;
  options: { id: string; name: string; priceMinor: number; capacity: number }[];
}[] };
type Look = { id: string; name: string; kind: string; items: {
  productName: string; productId: string; variantId: string; configuration: unknown;
}[] };
const studioProducts = {
  FASHION: new Set(fashionSets.flatMap(({ itemIds }) => itemIds)),
  BEAUTY: new Set(beautySets.flatMap(({ itemIds }) => itemIds)),
};
const secondary = styles.button + " " + styles.outline;
export function CartSummary({ cart, renderActions }: { cart: Cart; renderActions?: (item: Cart["items"][number]) => ReactNode }) {
  return <>
    {cart.items.length ? <ul className={styles.list}>{cart.items.map((item) => <li className={styles.row} key={item.variantId}>
      <div><strong>{item.productName}</strong><p className={styles.muted}>
        {item.variantName} · Qty {item.quantity}{item.available ? "" : " · Quantity unavailable"}
      </p></div>
      <span>{formatPrice(item.lineTotalMinor, cart.currency)}</span>{renderActions?.(item)}
    </li>)}</ul> : <p>Your account bag is empty.</p>}
    <p className={styles.row}><strong>Subtotal</strong><strong>{formatPrice(cart.subtotalMinor, cart.currency)}</strong></p>
  </>;
}

export function AccountCollections({ cart, looks, variantIds }: {
  cart: Cart; looks: Look[]; variantIds: Record<string, string>;
}) {
  const router = useRouter();
  const guest = useShopState();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const [removed, setRemoved] = useState<Cart["items"][number]>();

  async function update(work: () => Promise<unknown>, success: string) {
    setPending(true); setStatus(""); setFailed(false);
    try { await work(); setStatus(success); router.refresh(); }
    catch (error) { setFailed(true); setStatus(error instanceof Error ? error.message : "Please try again."); }
    finally { setPending(false); }
  }

  function saveFashion(name: string, ids: string[], color: string) {
    const items = ids.map((id) => ({ variantId: variantIds[id === defaultPendant && color === "silver" ? id + ":silver" : id] }));
    return accountRequest("/looks", "POST", { name, kind: "FASHION", items });
  }

  function saveBeauty() {
    const look = guest.savedBeautyLook;
    if (!look) return Promise.resolve();
    const lip = getLipstickShade(look.lipstickShadeId);
    const shadow = getEyeshadowShade(look.eyeshadowShadeId);
    const items = look.ids.map((id) => ({
      variantId: variantIds[id === lipstickId && lip.id !== defaultShade.id ? id + ":" + lip.id : id],
      configuration: { shadeId: id === lipstickId ? lip.id : id === "b-eyeshadow" ? shadow.id : look.productPanIds?.[id],
        intensity: look.intensities?.[id], finish: look.finishes?.[id],
        contourPlacement: beautyArea(id) === "contour" && !look.contourSketch ? look.contourPlacement : undefined,
        contourSketch: beautyArea(id) === "contour" ? look.contourSketch : undefined },
    }));
    return accountRequest("/looks", "POST", { name: "My beauty look", kind: "BEAUTY", items });
  }

  function loadLook(look: Look) {
    const fashion = look.kind === "FASHION";
    const items = look.items.filter((item) => studioProducts[fashion ? "FASHION" : "BEAUTY"].has(item.productId));
    if (!items.length) return;
    const ids = items.map(({ productId }) => productId);
    if (fashion) {
      const pendant = items.find(({ productId }) => productId === defaultPendant);
      updateFashionLook(defaultFashionLook, () => ({ ids, pendantColor: pendant && pendant.variantId === variantIds[defaultPendant + ":silver"] ? "silver" : "black" }));
      router.push("/studio/fashion");
      return;
    }
    const state = { ...defaultBeautyLook, ids, intensities: {}, finishes: {} };
    const intensities: NonNullable<typeof defaultBeautyLook.intensities> = {};
    const finishes: NonNullable<typeof defaultBeautyLook.finishes> = {};
    let contourPlacement: ContourPlacement | undefined;
    let contourSketch: ContourSketch | undefined;
    const productPanIds: Record<string, string> = {};
    for (const { productId, configuration, variantId } of items) {
      const config = configuration && typeof configuration === "object" ? configuration : {};
      const shade = "shadeId" in config && typeof config.shadeId === "string" ? config.shadeId : undefined;
      if (productId === lipstickId) {
        const key = Object.keys(variantIds).find((key) => variantIds[key] === variantId);
        state.lipstickShadeId = getLipstickShade(shade ?? key?.split(":")[1]).id;
      }
      if (productId === "b-eyeshadow") state.eyeshadowShadeId = getEyeshadowShade(shade).id;
      else if (shade && tryOnPalette(productId)?.some(({ id }) => id === shade)) productPanIds[productId] = shade;
      if (beautyArea(productId) === "contour" && "contourPlacement" in config) {
        contourPlacement = readContourPlacement(config.contourPlacement);
      }
      if (beautyArea(productId) === "contour" && "contourSketch" in config) {
        contourSketch = readContourSketch(config.contourSketch);
      }
      if ("intensity" in config && typeof config.intensity === "number") intensities[productId] = config.intensity;
      if ("finish" in config && typeof config.finish === "string") {
        const finish = beautyFinishes.find((option) => option.toLowerCase() === String(config.finish).toLowerCase());
        if (finish) finishes[productId] = finish;
      }
    }
    updateBeautyLook(() => ({ ...state, intensities, finishes, contourPlacement, contourSketch, productPanIds }));
    router.push("/studio/beauty");
  }

  const guestBag = Object.entries(guest.bag).flatMap(([key, quantity]) => {
    const line = bagLine(key);
    return line && variantIds[key] ? [{ key, quantity, line }] : [];
  });
  return (
    <div className={styles.panels} aria-busy={pending}>
      <section className={styles.panel} aria-labelledby="bag-heading">
        <h2 id="bag-heading">Account bag</h2>
        <CartSummary cart={cart} renderActions={(item) => {
          const path = "/cart/items/" + item.variantId;
          const change = (quantity: number) => update(() => accountRequest(path, quantity ? "PUT" : "DELETE", quantity ? { quantity } : undefined), "Account bag updated.");
          return <div className={styles.actions}>
            <BagOption product={item.productName} value={item.variantId} disabled={pending}
              options={item.options.map((option) => ({
                ...option, available: item.quantity + (option.id === item.variantId ? 0 : cart.items.find((line) => line.variantId === option.id)?.quantity ?? 0) <= option.capacity,
              }))}
              onChange={(variantId) => update(() => accountRequest(path, "PATCH", { variantId }), "Bag option updated.")} />
            <button className={secondary} disabled={pending || item.quantity === 1} aria-label={"Decrease quantity of " + item.productName} onClick={() => change(item.quantity - 1)}>−</button>
            <button className={secondary} disabled={pending || item.quantity >= 20} aria-label={"Increase quantity of " + item.productName} onClick={() => change(item.quantity + 1)}>+</button>
            <button className={secondary} disabled={pending} onClick={() => update(async () => {
              await accountRequest(path, "DELETE");
              setRemoved(item);
            }, item.productName + " removed.")}>Remove</button>
          </div>;
        }} />
        {removed && <div className={styles.actions}>
          <span>{removed.productName} removed.</span>
          <button className={secondary} disabled={pending} onClick={() => update(async () => {
            await accountRequest("/cart/restore", "POST", { variantId: removed.variantId, quantity: removed.quantity });
            setRemoved(undefined);
          }, removed.productName + " restored.")}>Undo removal</button>
        </div>}
        {cart.items.length ? <Link className={styles.button} href="/checkout">Review demo checkout</Link>
          : <Link className={styles.button} href="/shop">Continue shopping</Link>}
      </section>
      <section className={styles.panel} aria-labelledby="looks-heading">
        <h2 id="looks-heading">Saved looks</h2>
        {looks.length ? <ul className={styles.list}>{looks.map((look) => <li className={styles.row} key={look.id}>
          <div><strong>{look.name}</strong><p className={styles.muted}>{look.items.map(({ productName }) => productName).join(" · ")}</p></div>
          <div className={styles.actions}>
            {look.items.some(({ productId }) => studioProducts[look.kind === "FASHION" ? "FASHION" : "BEAUTY"].has(productId)) &&
              <button className={secondary} disabled={pending} onClick={() => loadLook(look)}>Load in studio</button>}
            <button className={secondary} disabled={pending} onClick={() => update(() => accountRequest("/looks/" + look.id, "DELETE"), "Look removed.")}>Remove</button>
          </div>
        </li>)}</ul> : <p>No looks are saved to your account yet.</p>}
        <div className={styles.actions}><Link href="/studio/fashion">Fashion Studio</Link><Link href="/studio/beauty">Beauty Studio</Link></div>
      </section>
      <section className={styles.panel} aria-labelledby="guest-heading">
        <h2 id="guest-heading">From this browser</h2>
        <p className={styles.muted}>Choose what to copy from your guest bag or studio looks. Your guest selections stay on this device.</p>
        <ul className={styles.list}>
          {guestBag.map(({ key, quantity, line }) => <li className={styles.row} key={key}>
            <span>{line.product.name}{line.variant ? " · " + line.variant : ""} · Qty {quantity}</span>
            <button className={secondary} disabled={pending || cart.items.some((item) => item.variantId === variantIds[key] && item.quantity >= quantity)}
              onClick={() => update(() => accountRequest("/cart/items/" + variantIds[key], "PUT", { quantity }), "Copied to your account bag.")}>Copy to bag</button>
          </li>)}
          {guest.savedOutfits?.map(({ number, look }) => <li className={styles.row} key={number}>
            <span>Outfit {number}</span>
            <button className={secondary} disabled={pending || looks.some((entry) => entry.name === "Outfit " + number)}
              onClick={() => update(() => saveFashion("Outfit " + number, look.ids, look.pendantColor), "Outfit copied to your account.")}>Copy outfit</button>
          </li>)}
          {guest.savedBeautyLook?.ids.length ? <li className={styles.row}><span>My beauty look</span>
            <button className={secondary} disabled={pending || looks.some((entry) => entry.name === "My beauty look")}
              onClick={() => update(saveBeauty, "Beauty look copied to your account.")}>Copy beauty look</button>
          </li> : null}
        </ul>
        {!(guestBag.length || guest.savedOutfits?.length || guest.savedBeautyLook?.ids.length) && <p className={styles.muted}>No guest selections to copy yet.</p>}
      </section>
      <p role="status" className={failed ? styles.error : styles.muted}>{status}</p>
    </div>
  );
}

