import { BackLink } from "../../back-link";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { allowedCameraHost, cameraPreviewEnabled } from "@/server/camera-preview";
import { worldHref } from "../../catalog";
import { Header } from "../../header";
import { beautySets, getLookSet, getSetItemId, setHref } from "../../look-sets";
import { findLipstickShade, lipstickId, makeupHref } from "../../makeup-data";
import { BeautyEditPreview } from "./beauty-edit-preview";
import styles from "./beauty-studio.module.css";

export const metadata: Metadata = {
  title: "Virtual Beauty Studio | FAIRY",
  description: "Try shades together and customize your look on the FAIRY sample model.",
};

export default async function BeautyStudioEntry({ searchParams }: {
  searchParams: Promise<{ set?: string | string[]; item?: string | string[]; shade?: string | string[] }>;
}) {
  const { set, item, shade } = await searchParams;
  const itemId = typeof item === "string" ? item : undefined;
  const itemSet = itemId ? beautySets.find(({ itemIds }) => itemIds.includes(itemId)) : undefined;
  const collection = getLookSet(beautySets, typeof set === "string" ? set : itemSet?.id);
  const returnItem = itemId ? getSetItemId(collection, itemId) : undefined;
  const initialShade = itemId === lipstickId ? findLipstickShade(shade)?.id : undefined;
  const collectionHref = setHref(makeupHref, beautySets, collection.id, returnItem);
  const cameraEnabled = cameraPreviewEnabled() && allowedCameraHost((await headers()).get("host"));
  return (
    <>
      <Header active="makeup" query="" />
      <main id="main" className={styles.page} tabIndex={-1}>
        <div className={styles.studioBar}>
          <BackLink href={collectionHref} />
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href={worldHref("makeup")}>Makeup</Link>
            <Link href={collectionHref}>{collection.title}</Link>
            <span aria-current="page">Virtual Studio</span>
          </nav>
        </div>
        <section className={styles.studio} aria-labelledby="studio-heading">
          <div className={styles.intro}>
            <h1 id="studio-heading">Your beauty, your way.</h1>
            <p>Try shades together. Find the look that feels like you.</p>
          </div>
          <BeautyEditPreview cameraEnabled={cameraEnabled} initialId={itemId} initialShade={initialShade}
            returnLink={{ href: collectionHref, title: collection.title }} />
        </section>
      </main>
    </>
  );
}

