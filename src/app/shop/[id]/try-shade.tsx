"use client";

import Link from "next/link";
import { lipstickId } from "../../makeup-data";
import { Icon } from "../../ui-icon";
import styles from "../catalog.module.css";

export function replaceProductShade(shadeId?: string) {
  const url = new URL(window.location.href);
  if (shadeId) url.searchParams.set("shade", shadeId);
  else url.searchParams.delete("shade");
  window.history.replaceState(null, "", url);
}

export function TryShadeLink({ setId, shadeId }: { setId: string; shadeId: string }) {
  const query = new URLSearchParams({ set: setId, item: lipstickId, shade: shadeId });
  return <Link href={"/studio/beauty?" + query} className={styles.sceneLink + " " + styles.tryShade}>
    Try this shade <Icon name="arrow" />
  </Link>;
}
