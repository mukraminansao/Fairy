import { BackLink } from "../../back-link";
import type { Metadata } from "next";
import Link from "next/link";
import { publishedLookSets } from "@/server/storefront";
import { worldHref } from "../../catalog";
import { fashionHref } from "../../fashion-data";
import { fashionSets, getLookSet, getSetItemId } from "../../look-sets";
import { Header } from "../../header";
import { SetPicker } from "../look-collection";
import { FashionScene } from "./fashion-scene";
import styles from "./fashion.module.css";

export const metadata: Metadata = {
  title: "Fashion Sets | FAIRY",
  description: "Mix pieces from FAIRY’s fashion sets and preview the outfit on the mannequin.",
};

export default async function MonochromeStreet({
  searchParams,
}: {
  searchParams: Promise<{ set?: string | string[]; item?: string | string[] }>;
}) {
  const { item, set: setId } = await searchParams;
  const sets = await publishedLookSets("FASHION", fashionSets);
  if (!sets.length) return <><Header active="" query="" /><main className={styles.page} id="main"><BackLink href="/looks" /><h1>No fashion sets are available right now.</h1><Link href="/shop">Explore the shop</Link></main></>;
  const set = getLookSet(sets, typeof setId === "string" ? setId : null);
  const initialItem = getSetItemId(set, typeof item === "string" ? item : null);
  return (
    <>
      <Header active="fashion" query="" />
      <main id="main" tabIndex={-1} className={styles.page}>
        <div className={styles.pageBar}>
          <div className={styles.backTrail}>
            <BackLink href="/looks" />
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <Link href={worldHref("fashion")}>Fashion</Link>
              <span key={set.id} aria-current="page" className="fairy-collection-title">{set.title}</span>
            </nav>
          </div>
          <SetPicker href={fashionHref} sets={sets} active={set.id} label="Fashion sets" />
        </div>
        <FashionScene key={set.id} set={set} initialItemId={initialItem} />
      </main>
    </>
  );
}

