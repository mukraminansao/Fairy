import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import scenes from "../../data/scenes.json";
import { getProduct, looksHref, money, productHref, products, shopHref, worldHref, worlds } from "./catalog";
import { fashionHref } from "./fashion-data";
import { lipstickId, makeupHref } from "./makeup-data";
import { Header } from "./header";
import { Icon } from "./ui-icon";
import { ProductActions } from "./shop-state";
import { ProductRail } from "./product-rail";
import styles from "./home.module.css";

type Parameters = Record<string, string | string[] | undefined>;

const steps = [
  { icon: "pointer", text: <>Tap an item<br /> to shop</> },
  { icon: "info", text: <>View details<br /> and options</> },
  { icon: "layers", text: <>Build your look<br /> and add to bag</> },
] as const;

const featuredProducts = [
  "b-lipstick", "f-rose-dress", "b-serum", "f-pendant", "b-blush", "f-jacket", "b-fragrance", "f-headphones", "b-eyeshadow",
].flatMap((id) => {
  const product = getProduct(id);
  return product ? [product] : [];
});

function FeaturedProducts() {
  return <ProductRail>
    {["main", "repeat"].map((group) => (
      <ul key={group} className={styles.railGroup} aria-hidden={group === "repeat" || undefined} data-repeat={group === "repeat" || undefined}>
        {featuredProducts.map(({ id, name, previewImage }) => (
          <li key={id} className={styles.railCard}>
            <div className={styles.railPhoto}><Image src={previewImage} alt="" fill sizes="(max-width: 1250px) 105px, (max-width: 1523px) 8.4vw, 128px" /></div>
            <span>{name}</span>
          </li>
        ))}
      </ul>
    ))}
  </ProductRail>;
}

function HeroCampaign() {
  return (
    <section className={styles.hero} aria-labelledby="campaign-heading">
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <h1 id="campaign-heading">Everything you love.<br />Beautifully together.</h1>
          <p>Explore fashion and beauty through shoppable looks, curated rituals, and pieces that feel like you.</p>
          <div className={styles.calls}>
            <Link href={shopHref()} className={styles.primary}>Explore collections</Link>
            <Link href={looksHref} className={styles.secondary}>Shop interactive looks</Link>
          </div>
        </div>
        <div className={styles.photo}>
          <Image src="/assets/homepage/campaign.webp"
            alt="FAIRY lipstick, skincare and fragrance beside a black jacket and silver pendant"
            fill preload quality={85} sizes="(max-width: 940px) 100vw, (max-width: 1210px) 68vw, (max-width: 1616px) 1010px, (max-width: 1792px) 62.5vw, 1120px" />
          <Link href={makeupHref + "?item=" + lipstickId} className={styles.hotspot}
            aria-label="Shop this item: Satin Lipstick">
            <span className={styles.hotspotHint} aria-hidden="true">
              Tap an item to shop
              <svg viewBox="0 0 28 43" width="28" height="43" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M2 2c11 7 18 17 20 35m-5-4 5 5 4-6" />
              </svg>
            </span>
            <span className={styles.hotspotLabel} aria-hidden="true"><Icon name="bag" />Shop this item</span>
          </Link>
        </div>
        <div className={styles.blossoms} aria-hidden="true">
          <Image src="/assets/images/hero-blossoms.webp" alt="" fill sizes="(max-width: 700px) 38vw, (max-width: 1210px) 26vw, 16vw" />
        </div>
      </div>
    </section>
  );
}

function CategoryStrip() {
  return (
    <section id="collections" className={styles.collections} aria-labelledby="worlds-heading" tabIndex={-1}>
      <div className={styles.sectionTitle}><h2 id="worlds-heading">Shop by world</h2></div>
      <ul className={styles.cards}>
        {worlds.map(({ id, label, image, alt }) => (
          <li key={id}>
            <Link className={styles.card} href={worldHref(id)}>
              <div className={styles.cardPhoto}>
                <Image src={image} alt={alt} fill quality={85}
                  sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw" />
              </div>
              <span className={styles.cardLabel}>{label}<Icon name="arrow" /></span>
            </Link>
          </li>
        ))}
      </ul>
      <section className={styles.guide} aria-labelledby="guide-heading">
        <div className={styles.guideIntro}>
          <h2 id="guide-heading">Discover the look</h2>
          <p>Select any product in a scene, view details, and try it your way.</p>
        </div>
        <ol>
          {steps.map(({ icon, text }, index) => (
            <li key={icon}>
              <Icon name={icon} />
              <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

function Selection({ query, world, item, look }: { query: string; world: string; item: string; look: string }) {
  const category = worlds.find(({ id }) => id === world);
  const scene = scenes.scenes.find(({ id }) => id === look);
  const product = products.find(({ id }) => id === item);
  if (!query && !world && !item && !look) return null;

  const terms = query.toLowerCase().split(/\s+/);
  const matches = query
    ? products.filter(({ name, category }) => terms.every((term) => (name + " " + category).toLowerCase().includes(term)))
    : products.filter(({ id, category: productCategory }) =>
      id === product?.id || productCategory === category?.id || world === "new" ||
      scene?.hotspots.some(({ productId }) => id === productId),
    );
  const title = query ? "Search results" : category?.label ?? scene?.title ?? product?.name ??
    (world === "new" ? "New In" : "Selection unavailable");

  return (
    <section className={styles.selection} id="selection" aria-labelledby="selection-heading" tabIndex={-1}>
      <h2 id="selection-heading">{title}</h2>
      {query && <p>Results for “{query}”</p>}
      {matches.length ? (
        <>
          <p>Demo catalog · prices in USD</p>
          {world === "fashion" && <p><Link className={styles.sceneLink} href={fashionHref}>Shop Monochrome Street <Icon name="arrow" /></Link></p>}
          {world === "makeup" && <p><Link className={styles.sceneLink} href={makeupHref}>Shop Soft Rose Edit <Icon name="arrow" /></Link></p>}
          <ul className={styles.products}>
            {matches.map((entry) => (
              <li key={entry.id}>
                {product?.id === entry.id && <Image src={entry.previewImage} alt={entry.name} width={180} height={180} />}
                <div><h3><Link href={productHref(entry.id)}>{entry.name}</Link></h3><p>{money(entry.priceCents)}</p></div>
                <ProductActions product={entry} />
              </li>
            ))}
          </ul>
        </>
      ) : <p>No matching products. Try searching for a product name or category.</p>}
    </section>
  );
}

function parameter(params: Parameters, key: string) {
  const value = params[key];
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

export default async function Home({ searchParams }: { searchParams: Promise<Parameters> }) {
  const params = await searchParams;
  const world = parameter(params, "world");
  if (world === "looks") redirect(looksHref + "#selection");
  const query = parameter(params, "q");
  return (
    <>
      <Header active={world || (query ? "" : "home")} query={query} />
      <main id="main" tabIndex={-1}>
        <HeroCampaign />
        <FeaturedProducts />
        <CategoryStrip />
        <Selection query={query} world={world} item={parameter(params, "item")} look={parameter(params, "look")} />
      </main>
    </>
  );
}
