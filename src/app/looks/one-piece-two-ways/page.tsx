import { BackLink } from "../../back-link";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedLookSets, shopCatalog } from "@/server/storefront";
import { Header } from "../../header";
import { fashionSets } from "../../look-sets";
import { twoWays, twoWaysAvailable, twoWaysTitle } from "../two-ways";
import styles from "../looks.module.css";
import { StyleEdit } from "./style-edit";

export const metadata: Metadata = {
  title: twoWaysTitle + " | FAIRY",
  description: "Explore two ways to wear FAIRY’s Rose Satin Maxi Dress and try either outfit in the Fitting Room.",
};

export default async function TwoWaysPage({ searchParams }: { searchParams: Promise<{ style?: string | string[]; piece?: string | string[] }> }) {
  const [{ style, piece }, sets, catalog] = await Promise.all([searchParams, publishedLookSets("FASHION", fashionSets), shopCatalog()]);
  if (!twoWaysAvailable(sets)) notFound();
  const active = twoWays.find(({ id }) => id === style) ?? twoWays[0];

  return <>
    <Header active="looks" query="" />
    <main className={styles.page} id="main" tabIndex={-1}>
      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link><Link href="/looks">Interactive looks</Link><span aria-current="page">{twoWaysTitle}</span>
        </nav>
        <BackLink href="/looks" />
        <div className={styles.intro}>
          <h1>{twoWaysTitle}</h1>
          <p>The Rose Satin Maxi Dress, styled for two occasions.</p>
        </div>
        <StyleEdit initialStyle={active.id} initialPiece={typeof piece === "string" ? piece : undefined}
          productSlugs={Object.fromEntries((catalog ?? []).map(({ id, slug }) => [id, slug]))} />
      </div>
    </main>
  </>;
}
