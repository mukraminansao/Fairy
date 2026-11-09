"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { accountRequest } from "./client-api";
import { BagButton } from "../bag-button";
import styles from "../shop.module.css";

export function AccountProductActions({ name, variantId, inStock, card, mobileLabel }: {
  name: string; variantId: string; inStock: boolean; card?: boolean; mobileLabel?: string;
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ variantId: string; text: string; confirmation?: number }>();
  const confirmation = useRef(0);
  const result = feedback?.variantId === variantId ? feedback : undefined;
  const status = result?.text ?? "";
  const added = result?.confirmation !== undefined;

  async function add() {
    setPending(true);
    try {
      const cart = await accountRequest<{ items: { variantId: string; quantity: number }[] }>("/cart/items/" + variantId, "POST");
      const quantity = cart.items.find((item) => item.variantId === variantId)?.quantity ?? 1;
      setFeedback({ variantId, confirmation: ++confirmation.current, text: "Added to account bag · Qty " + quantity });
    } catch (error) {
      setFeedback({ variantId, text: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setPending(false);
    }
  }

  return <div className={styles.productActions} data-card={card || undefined}>
    <div className={styles.actionButtons} role="group" aria-label={name + " shopping actions"}>
      <BagButton disabled={pending || !inStock} confirmation={result?.confirmation} onAdd={add}
        mobileLabel={mobileLabel} mobileStatus={status || (inStock ? undefined : "Out of demo stock")} />
    </div>
    <span role="status" className={styles.actionStatus} data-confirmed={added || undefined}>{status}{added && <> <Link href="/account">View account bag</Link></>}</span>
  </div>;
}
