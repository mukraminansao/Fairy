"use client";

import { money } from "../catalog";
import { bagLine, useShopState } from "../shop-state";
import styles from "../account/account.module.css";

export function GuestCheckout() {
  const { bag } = useShopState();
  const lines = Object.entries(bag).flatMap(([key, quantity]) => {
    const line = bagLine(key);
    return line ? [{ key, quantity, ...line }] : [];
  });
  return <>
    <p className={styles.muted}>This guest bag is saved on this device.</p>
    {lines.length ? <ul className={styles.list}>{lines.map(({ key, quantity, product, variant }) => <li className={styles.row} key={key}>
      <div><strong>{product.name}</strong><p className={styles.muted}>{variant ? variant + " · " : ""}Qty {quantity}</p></div>
      <span>{money(quantity * product.priceCents)}</span>
    </li>)}</ul> : <p>Your demo bag is empty.</p>}
    <p className={styles.row}><strong>Subtotal</strong><strong>{money(lines.reduce((sum, line) => sum + line.quantity * line.product.priceCents, 0))}</strong></p>
  </>;
}

