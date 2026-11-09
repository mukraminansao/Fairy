"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { Icon } from "./ui-icon";
import styles from "./back-link.module.css";

type NavigationHistory = {
  currentEntry: { index: number } | null;
  entries: () => { url: string | null }[];
};

function previousPage() {
  const navigation = (window as Window & { navigation?: NavigationHistory }).navigation;
  if (navigation?.currentEntry) {
    return navigation.entries()[navigation.currentEntry.index - 1]?.url;
  }
  if (window.history.length > 1) return window.history.state?.fairyPreviousPage;
}

export function BackLink({ href, label = "Back", scroll }: {
  href: string;
  label?: string;
  scroll?: boolean;
}) {
  function goBack(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const previous = previousPage();
    if (typeof previous !== "string" || new URL(previous, window.location.href).origin !== window.location.origin) return;
    event.preventDefault();
    window.history.back();
  }

  return <Link className={styles.back} href={href} scroll={scroll} onClick={goBack}>
    <Icon name="arrow" /> {label}
  </Link>;
}
