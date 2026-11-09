import { BackLink } from "../back-link";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { publishedLookSets } from "@/server/storefront";
import { shopHref } from "../catalog";
import { fashionHref } from "../fashion-data";
import { Header } from "../header";
import { beautySets, fashionSets, setHref, type LookSet } from "../look-sets";
import { makeupHref } from "../makeup-data";
import { Icon } from "../ui-icon";
import { twoWaysAvailable, twoWaysHref, twoWaysTitle } from "./two-ways";
import styles from "./looks.module.css";

export const metadata: Metadata = {
  title: "Shop Interactive Looks | FAIRY",
  description: "Browse FAIRY’s shoppable outfits and beauty edits. Open a set to shop and try its pieces.",
};

const descriptors: Record<string, string> = {
  "monochrome-street": "Streetwear", "rose-occasion": "Evening outfit", "sage-layers": "Soft neutrals",
  "soft-rose-edit": "Everyday makeup", "warm-bronze": "Warm glow", "berry-muse": "Berry tones",
  "peach-atelier": "Peach tones", "mocha-sculpt": "Caramel neutrals", "midnight-pearl": "Cool shimmer",
};

function LookGroup({ id, title, href, sets }: { id: string; title: string; href: string; sets: readonly LookSet[] }) {
  if (!sets.length) return null;

  return <section className={styles.group} id={id} aria-labelledby={id + "-heading"}>
    <h2 id={id + "-heading"}>{title}</h2>
    <ul className={styles.grid}>
      {sets.map((set) => <li key={set.id}>
        <Link className={styles.card} href={setHref(href, sets, set.id)} aria-labelledby={set.id + "-title"} aria-describedby={set.id + "-description"}>
          <div className={styles.photo}>
            <Image src={set.image} alt="" fill sizes="(max-width: 364px) 95vw, (max-width: 760px) 48vw, (max-width: 1440px) 32vw, 456px" />
          </div>
          <div className={styles.cardCopy}>
            {descriptors[set.id] && <span className={styles.descriptor}>{descriptors[set.id]}</span>}
            <h3 id={set.id + "-title"}>{set.title}</h3>
            <Icon name="arrow" />
            <p id={set.id + "-description"}>{set.description}</p>
          </div>
        </Link>
      </li>)}
    </ul>
  </section>;
}

export default async function LooksPage() {
  const [fashion, beauty] = await Promise.all([
    publishedLookSets("FASHION", fashionSets), publishedLookSets("BEAUTY", beautySets),
  ]);

  return <>
    <Header active="looks" query="" />
    <main className={styles.page} id="main" tabIndex={-1}>
      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-current="page">Interactive looks</span>
        </nav>
        <BackLink href="/" />
        <div className={styles.intro} id="selection">
          <h1>Shop interactive looks</h1>
          <p>Open a set, tap the pieces you like, and try them together.</p>
        </div>
        {fashion.length > 0 && beauty.length > 0 && <nav className={styles.groups} aria-label="Look categories">
          <a href="#fashion-sets">Fashion sets</a>
          <a href="#beauty-sets">Beauty edits</a>
        </nav>}
        {twoWaysAvailable(fashion) && <Link href={twoWaysHref} className={styles.feature}>
          <Image src="/assets/fashion/items/f-rose-dress.webp" alt="" width={120} height={120} />
          <div><span className={styles.descriptor}>Featured styling edit</span><h2>{twoWaysTitle}</h2>
            <p>See the Rose Satin Maxi Dress styled for day and evening.</p></div>
          <Icon name="arrow" />
        </Link>}
        <LookGroup id="fashion-sets" title="Fashion sets" href={fashionHref} sets={fashion} />
        <LookGroup id="beauty-sets" title="Beauty edits" href={makeupHref} sets={beauty} />
        {!fashion.length && !beauty.length && <p className={styles.empty}>No interactive sets are available right now. <Link href={shopHref()}>Explore the catalog</Link></p>}
      </div>
    </main>
  </>;
}
