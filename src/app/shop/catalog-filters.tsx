"use client";

import Form from "next/form";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../ui-icon";
import styles from "./catalog.module.css";

export function CatalogFilters({ children, count, clearHref }: {
  children: ReactNode;
  count: number;
  clearHref: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 700px)");
    function closeOnDesktop(event: MediaQueryListEvent) {
      if (!event.matches) dialog.current?.close();
    }
    phone.addEventListener("change", closeOnDesktop);
    return () => phone.removeEventListener("change", closeOnDesktop);
  }, []);

  function close() {
    dialog.current?.close();
  }

  return <>
    <Form className={styles.filters} action="/shop" prefetch={false}>
      {children}
      <button type="submit">Apply filters</button>
      {count > 0 && <Link href={clearHref}>Clear filters</Link>}
    </Form>
    <button type="button" className={styles.filterToggle} aria-haspopup="dialog" aria-controls="catalog-filter-dialog"
      onClick={() => {
        dialog.current?.querySelector("form")?.reset();
        dialog.current?.showModal();
      }}>
      <Icon name="filter" /> Filter {count > 0 && <span>{count}</span>}
    </button>
    <dialog ref={dialog} id="catalog-filter-dialog" className={styles.filterDialog} aria-labelledby="catalog-filter-title"
      closedby="any" data-motion-dialog>
      <div className={styles.filterHeading}>
        <h2 id="catalog-filter-title">Filter products</h2>
        <button type="button" autoFocus aria-label="Close filters" onClick={close}><Icon name="close" /></button>
      </div>
      <Form className={styles.filters} action="/shop" prefetch={false} onSubmit={close}>
        {children}
        <div className={styles.filterActions}>
          {count > 0 && <Link href={clearHref} onNavigate={close}>Clear filters</Link>}
          <button type="submit">Apply filters</button>
        </div>
      </Form>
    </dialog>
  </>;
}
