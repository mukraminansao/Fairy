"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useId, useRef, useState, type ReactNode } from "react";
import { accountRequest } from "./account/client-api";
import { formatPrice } from "./catalog";
import { addBagItems, bagLine, useClientReady, useShopState } from "./shop-state";
import { Icon } from "./ui-icon";
import styles from "./look-review.module.css";

type Quote = { key: string; priceMinor: number; currency: string; available: boolean };

export function LookReview({ keys, labels, className, children, disabled, onAdded }: {
  keys: string[]; labels?: Record<string, string>; className: string; children: ReactNode;
  disabled: boolean; onAdded: (added: string[]) => void;
}) {
  const title = useId();
  const ready = useClientReady();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote[] | null>();
  const { bag } = useShopState();
  const rows = keys.flatMap((key) => {
    const line = bagLine(key);
    if (!line) return [];
    const account = quote?.find((option) => option.key === key);
    return [{ key, ...line, currency: account?.currency ?? "USD",
      price: account?.priceMinor ?? line.product.priceCents,
      available: quote === null ? (bag[key] ?? 0) < line.stock : Boolean(account?.available) }];
  });
  const selected = rows.filter(({ available, key }) => available && !excluded.includes(key));
  const currency = selected[0]?.currency ?? "USD";
  const total = selected.reduce((sum, { price }) => sum + price, 0);
  const mixedCurrency = selected.some((item) => item.currency !== currency);
  const adding = pending && quote !== undefined;

  async function loadQuote() {
    const account = await accountRequest<{ name: string | null } | null>("/session-summary");
    const params = new URLSearchParams(keys.map((key) => ["option", key]));
    setQuote(account ? await accountRequest<Quote[]>("/cart/look?" + params) : null);
  }

  async function open() {
    setExcluded([]);
    setQuote(undefined);
    setError("");
    setPending(true);
    dialog.current?.showModal();
    try { await loadQuote(); }
    catch { setError("The bag could not be checked. Close this review and try again."); }
    finally { setPending(false); }
  }

  async function add() {
    setPending(true);
    setError("");
    const chosen = selected.map(({ key }) => key);
    try {
      const added = quote === null ? addBagItems(chosen) : await accountRequest<string[]>("/cart/look", "POST", { keys: chosen });
      if (!added.length) throw new Error("Availability changed. Review the remaining options and try again.");
      onAdded(added);
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Try adding these items again.");
      try { await loadQuote(); } catch { setQuote(undefined); }
    } finally { setPending(false); }
  }

  return <>
    <button ref={opener} type="button" className={className} disabled={disabled || !ready || pending} aria-haspopup="dialog" onClick={open}>{children}</button>
    {ready && createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={title}
      onClose={() => requestAnimationFrame(() => opener.current?.focus())} onCancel={(event) => {
      if (adding) event.preventDefault();
    }}>
      <div className={styles.heading}>
        <h2 id={title}>Review your look</h2>
        <button type="button" className={styles.close} disabled={adding} aria-label="Close review" onClick={() => dialog.current?.close()}><Icon name="close" /></button>
      </div>
      <p>Choose the pieces you want to add to your {quote ? "account bag" : "demo bag"}.</p>
      {quote === undefined && pending && <p role="status">Checking availability…</p>}
      {error && <p role="alert" className={styles.notice}>{error}</p>}
      {quote !== undefined && <ul className={styles.rows} aria-label="Items in your look">
        {rows.map(({ key, product, variant, available, price, currency }) => (
          <li key={key}>
            <label>
              <input type="checkbox" checked={available && !excluded.includes(key)} disabled={pending || !available}
                onChange={(event) => setExcluded(event.currentTarget.checked ? excluded.filter((item) => item !== key) : [...excluded, key])} />
              <Image src={product.previewImage} alt="" width={48} height={48} />
              <span><strong>{product.name}</strong>{variant && <small>{variant}</small>}
                {labels?.[key] && <small>{labels[key]}</small>}
                {!available && <small className={styles.notice}>Unavailable for this bag</small>}</span>
              <span>{formatPrice(price, currency)}</span>
            </label>
          </li>
        ))}
      </ul>}
      <div className={styles.footer}>
        <p aria-live="polite"><strong>Total</strong> <strong>{mixedCurrency ? "Multiple currencies" : formatPrice(total, currency)}</strong></p>
        {mixedCurrency && <p className={styles.notice}>Choose items priced in the same currency.</p>}
        <button type="button" disabled={pending || !selected.length || mixedCurrency} onClick={add}>
          {adding ? "Adding…" : "Add selected to bag"}
        </button>
      </div>
    </dialog>, document.body)}
  </>;
}
