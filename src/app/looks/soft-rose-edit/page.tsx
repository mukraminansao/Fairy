import { BackLink } from "../../back-link";
import type { Metadata } from "next";
import Link from "next/link";
import { publishedLookSets } from "@/server/storefront";
import { worldHref } from "../../catalog";
import { Header } from "../../header";
import { beautySets, getLookSet, getSetItemId } from "../../look-sets";
import { makeupHref } from "../../makeup-data";
import { SetPicker } from "../look-collection";
import { MakeupScene } from "./makeup-scene";
import styles from "./makeup.module.css";

export const metadata: Metadata = {
  title: "Beauty Sets | FAIRY",
  description: "Shop and mix makeup from FAIRY’s beauty edits.",
};

export default async function SoftRoseEdit({ searchParams }: {
  searchParams: Promise<{ set?: string | string[]; item?: string | string[] }>;
}) {
  const { item, set: setId } = await searchParams;
  const sets = await publishedLookSets("BEAUTY", beautySets);
  if (!sets.length) return <><Header active="" query="" /><main className={styles.page} id="main"><BackLink href="/looks" /><h1>No beauty sets are available right now.</h1><Link href="/shop">Explore the shop</Link></main></>;
  const set = getLookSet(sets, typeof setId === "string" ? setId : null);
  const initialItem = getSetItemId(set, typeof item === "string" ? item : null);
  return (
    <>
      <Header active="makeup" query="" />
      <main id="main" className={styles.page} tabIndex={-1}>
        <div className={styles.pageBar}>
          <div className={styles.backTrail}>
            <BackLink href="/looks" />
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <Link href={worldHref("makeup")}>Makeup</Link>
              <span key={set.id} aria-current="page" className="fairy-collection-title">{set.title}</span>
            </nav>
          </div>
          <SetPicker href={makeupHref} sets={sets} active={set.id} label="Beauty sets" />
        </div>
        <MakeupScene key={set.id} set={set} initialItemId={initialItem} />
      </main>
    </>
  );
}

