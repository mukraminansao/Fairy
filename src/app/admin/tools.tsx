"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { accountRequest } from "../account/client-api";
import { formatPrice } from "../catalog";
import styles from "../account/account.module.css";

type Product = { id: string; name: string; status: string; variants: {
  id: string; sku: string; name: string; priceMinor: number; currency: string; onHand: number | null;
}[] };

export function CatalogTools({ products, canEdit }: { products: Product[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  async function save(path: string, body: unknown) {
    setBusy(true); setFailed(false); setStatus("");
    try { await accountRequest(path, "PATCH", body); setStatus("Change saved."); router.refresh(); }
    catch (error) { setFailed(true); setStatus(error instanceof Error ? error.message : "Change could not be saved."); }
    finally { setBusy(false); }
  }

  return <div>
    <p className={failed ? styles.error : styles.muted} role="status">{status}</p>
    {products.map((product) => <details className={styles.panel} key={product.id}>
      <summary>{product.name} · {product.status.toLowerCase()}</summary>
      {canEdit && <form className={styles.actions} action={(fields) => save("/admin/products/" + product.id, { status: fields.get("status") })}>
        <label className={styles.field}>Product status<select key={product.status} defaultValue={product.status} name="status">
          <option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option>
        </select></label>
        <button className={styles.button} disabled={busy}>Save status</button>
      </form>}
      <ul className={styles.list}>{product.variants.map((variant) => <li className={styles.row} key={variant.id}>
        <div><strong>{variant.name}</strong><p className={styles.muted}>{variant.sku} · {formatPrice(variant.priceMinor, variant.currency)} · {variant.onHand ?? 0} on hand</p></div>
        {canEdit && <>
          <form className={styles.actions} action={(fields) => save("/admin/variants/" + variant.id, { priceMinor: Math.round(Number(fields.get("price")) * 100) })}>
            <label className={styles.field}>Price ({variant.currency})<input className={styles.small} key={variant.priceMinor} name="price" type="number" min="0" step=".01" max="1000000" defaultValue={variant.priceMinor / 100} required /></label>
            <button className={styles.button} disabled={busy}>Save price</button>
          </form>
          {variant.onHand !== null && <form className={styles.actions} action={(fields) => save("/admin/inventory/" + variant.id, { onHand: Number(fields.get("stock")), reason: fields.get("reason") })}>
            <label className={styles.field}>On hand<input className={styles.small} key={variant.onHand} name="stock" type="number" min="0" max="1000000" defaultValue={variant.onHand} required /></label>
            <label className={styles.field}>Reason<input name="reason" maxLength={160} required /></label>
            <button className={styles.button} disabled={busy}>Save stock</button>
          </form>}
        </>}
      </li>)}</ul>
    </details>)}
  </div>;
}

