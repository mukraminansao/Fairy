"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AccountProductActions } from "../../account/product-actions";
import { formatPrice } from "../../catalog";
import { replaceProductShade, TryShadeLink } from "./try-shade";
import styles from "../catalog.module.css";

type Option = { id: string; sku: string; name: string; priceMinor: number; currency: string; hex?: string; shadeId?: string; inStock: boolean };

export function AccountOptions({ name, options, photographed, tryOnSet }: {
  name: string; options: Option[]; photographed?: string; tryOnSet?: string;
}) {
  const [id, setId] = useState(options[0]?.id);
  const shade = useSearchParams().get("shade");
  const matchingShade = tryOnSet && shade ? options.find((option) => option.shadeId === shade) : undefined;
  const choice = matchingShade ?? options.find((option) => option.id === id) ?? options[0];
  if (!choice) return <p>There are no active options for this product.</p>;

  const price = formatPrice(choice.priceMinor, choice.currency);
  return <>
    {options.length > 1 && <fieldset className={styles.options}>
      <legend>{options.every(({ hex }) => hex) ? "Shade" : "Choose an option"}</legend>
      {options.map(({ id, name, hex, shadeId }) => <label key={id}>
        <input type="radio" name="account-variant" checked={id === choice.id} onChange={() => {
          setId(id);
          if (tryOnSet) replaceProductShade(shadeId);
        }} />
        {hex && <span className={styles.swatch} style={{ backgroundColor: hex }} aria-hidden="true" />}
        {name}
      </label>)}
    </fieldset>}
    {photographed && choice.name !== photographed && <p className={styles.sku}>The main photo shows {photographed}.</p>}
    <p className={styles.sku} aria-live="polite">{price} · {choice.inStock ? "In demo stock" : "Out of demo stock"} · SKU {choice.sku}</p>
    <AccountProductActions name={name} variantId={choice.id} inStock={choice.inStock}
      mobileLabel={(options.length > 1 ? choice.name : name) + " · " + price} />
    {tryOnSet && choice.shadeId && <TryShadeLink setId={tryOnSet} shadeId={choice.shadeId} />}
  </>;
}

