import { BackLink } from "../../back-link";
import type { Metadata } from "next";
import Link from "next/link";
import { defaultFashionLook, fashionHref } from "../../fashion-data";
import { fashionSets, getLookSet, getSetItemId, setHref } from "../../look-sets";
import { Header } from "../../header";
import { FittingPreview } from "../../looks/monochrome-street/fitting-preview";
import { twoWays, twoWaysHref, twoWaysTitle } from "../../looks/two-ways";
import styles from "../../looks/monochrome-street/fashion.module.css";

export const metadata: Metadata = { title: "Virtual Fitting Room | FAIRY" };

export default async function FashionFittingRoom({ searchParams }: {
  searchParams: Promise<{ set?: string | string[]; item?: string | string[]; style?: string | string[] }>;
}) {
  const { set, item, style } = await searchParams;
  const collection = getLookSet(fashionSets, typeof set === "string" ? set : undefined);
  const returnItem = typeof item === "string" ? getSetItemId(collection, item) : undefined;
  const preset = twoWays.find(({ id }) => id === style);
  const collectionHref = preset ? twoWaysHref + "?" + new URLSearchParams({ style: preset.id })
    : setHref(fashionHref, fashionSets, collection.id, returnItem);
  const collectionTitle = preset ? twoWaysTitle : collection.title;
  const initialLook = preset?.look ?? (collection.id === fashionSets[0].id ? defaultFashionLook
    : { ...defaultFashionLook, ids: [...collection.itemIds] });
  return (
    <>
      <Header active="fashion" query="" />
      <main className={styles.page} id="main" tabIndex={-1}>
        <div className={styles.studioBar}>
          <BackLink href={collectionHref} />
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <Link href={collectionHref}>{collectionTitle}</Link>
            <span aria-current="page">Fitting room</span>
          </nav>
        </div>
        <div className={styles.room}>
          <h1>Your virtual fitting room</h1>
          <FittingPreview initialLook={initialLook} returnLink={{ href: collectionHref, title: collectionTitle }} />
        </div>
      </main>
    </>
  );
}
