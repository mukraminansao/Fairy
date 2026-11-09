"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { productHref } from "../catalog";
import { catalogAnchor } from "./catalog-navigation";
import styles from "./catalog.module.css";

function positionKey(listing: string, anchor: string) {
  return "fairy:catalog-position:" + listing + "#" + anchor;
}

export function CatalogProductLink({ listing, slug, className, children }: {
  listing: string; slug: string; className: string; children: ReactNode;
}) {
  const anchor = catalogAnchor(slug);
  return <Link className={className} id={anchor}
    href={productHref(slug) + "?" + new URLSearchParams({ from: listing })}
    onNavigate={() => {
      window.history.replaceState({ ...window.history.state, fairyCatalogAnchor: anchor }, "");
      try { sessionStorage.setItem(positionKey(listing, anchor), String(window.scrollY)); }
      catch { /* The anchor is available when session storage is blocked. */ }
    }}>
    {children}
  </Link>;
}

export function CatalogPosition({ listing }: { listing: string }) {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const anchor = hash || window.history.state?.fairyCatalogAnchor;
    const product = typeof anchor === "string" && anchor.startsWith("catalog-product-") ? document.getElementById(anchor) : null;
    if (!product) return;
    const card = product.closest("li");
    let clearHighlight: number | undefined;
    const frame = requestAnimationFrame(() => {
      card?.classList.add(styles.returnedProduct);
      clearHighlight = window.setTimeout(() => card?.classList.remove(styles.returnedProduct), 1200);
      if (!hash) {
        product.focus({ preventScroll: true });
        return;
      }
      let position: string | null = null;
      try { position = sessionStorage.getItem(positionKey(listing, anchor)); }
      catch { /* Fall back to the selected card. */ }
      if (position !== null && Number.isFinite(Number(position))) {
        window.scrollTo({ top: Number(position), behavior: "instant" });
      } else {
        product.scrollIntoView({ block: "center", behavior: "instant" });
      }
      product.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(clearHighlight);
      card?.classList.remove(styles.returnedProduct);
    };
  }, [listing]);

  return null;
}
