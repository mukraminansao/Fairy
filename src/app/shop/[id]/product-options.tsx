"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { money, productVariants, type Product } from "../../catalog";
import { findLipstickShade, lipstickShades, lipstickVariantKey } from "../../makeup-data";
import { ProductActions, useShopState } from "../../shop-state";
import { replaceProductShade, TryShadeLink } from "./try-shade";
import styles from "../catalog.module.css";

export function ProductOptions({ product, tryOnSet }: { product: Product; tryOnSet?: string }) {
  const variants = productVariants(product);
  const photographed = variants.find(({ key }) => key === product.id);
  const [variantKey, setVariantKey] = useState(product.id);
  const requestedShade = findLipstickShade(useSearchParams().get("shade"));
  const selectedKey = tryOnSet && requestedShade ? lipstickVariantKey(requestedShade.id) : variantKey;
  const variant = variants.find(({ key }) => key === selectedKey) ?? variants[0];
  const activeShade = tryOnSet && lipstickShades.find(({ id }) => lipstickVariantKey(id) === variant.key);
  const { bag } = useShopState();
  const remaining = Math.max(0, variant.stock - (bag[variant.key] ?? 0));

  return (
    <>
      {variants.length > 1 && (
        <fieldset className={styles.options}>
          <legend>{product.shades?.length ? "Shade" : "Finish"}</legend>
          {variants.map(({ key, name, hex }) => (
            <label key={key}>
              <input type="radio" name="variant" value={key} checked={key === variant.key} onChange={() => {
                const shade = tryOnSet && lipstickShades.find(({ id }) => lipstickVariantKey(id) === key);
                if (shade) replaceProductShade(shade.id);
                else setVariantKey(key);
              }} />
              {hex && <span className={styles.swatch} style={{ backgroundColor: hex }} aria-hidden="true" />}
              {name}
            </label>
          ))}
        </fieldset>
      )}
      {variant.key !== product.id && photographed?.name && <p className={styles.sku}>The product photo shows {photographed.name}.</p>}
      <p className={styles.stock} aria-live="polite">
        {remaining ? remaining + (remaining === 1 ? " unit" : " units") + " available in demo stock" : "Demo stock limit reached for this option"}
      </p>
      <p className={styles.sku}>SKU {variant.sku}</p>
      <ProductActions key={variant.key} product={product} variantKey={variant.key}
        mobileLabel={(variant.name ?? product.name) + " · " + money(product.priceCents)} />
      {tryOnSet && activeShade && <TryShadeLink setId={tryOnSet} shadeId={activeShade.id} />}
    </>
  );
}
