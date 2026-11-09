import { BackLink } from "../../back-link";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/server/auth";
import { defaultVariant, shopProduct } from "@/server/storefront";
import { getProduct, money, productVariants, shopHref, worlds } from "../../catalog";
import { fashionHref } from "../../fashion-data";
import { Header } from "../../header";
import { beautySets, fashionSets, setHref } from "../../look-sets";
import { lipstickId, lipstickShades, lipstickVariantKey, makeupHref } from "../../makeup-data";
import { Icon } from "../../ui-icon";
import { catalogAnchor, catalogFrom } from "../catalog-navigation";
import { ProductGallery } from "./product-gallery";
import { AccountOptions } from "./account-options";
import { ProductOptions } from "./product-options";
import styles from "../catalog.module.css";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const row = await shopProduct(id);
  const product = row === undefined ? getProduct(id) : row;
  return { title: product ? product.name + " | FAIRY" : "Product unavailable | FAIRY", description: product?.description };
}

export default async function ProductPage({ params, searchParams }: Params & { searchParams: Promise<{ from?: string | string[] }> }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const [row, user] = await Promise.all([shopProduct(id), currentUser()]);
  const fixture = getProduct(id);
  const product = row === undefined ? fixture : row;
  if (!product) notFound();
  const selected = row ? defaultVariant(row) : undefined;
  const price = selected?.priceMinor ?? fixture?.priceCents ?? 0;
  const photos = row?.images.length ? row.images.map(({ path, alt }) => ({ path, alt }))
    : fixture ? [{ path: fixture.previewImage, alt: fixture.name + " product close-up" }] : [];
  const photographed = fixture ? productVariants(fixture).find(({ key }) => key === product.id)?.name : undefined;
  const listing = catalogFrom(from);
  const world = worlds.find(({ id }) => id === product.category);
  const outfit = fashionSets.find(({ itemIds }) => itemIds.includes(product.id));
  const makeup = beautySets.find(({ itemIds }) => itemIds.includes(product.id));
  const tryOnSet = product.id === lipstickId ? makeup?.id : undefined;
  const scene = outfit ?? makeup;
  const sceneHref = outfit ? setHref(fashionHref, fashionSets, outfit.id, product.id)
    : makeup ? setHref(makeupHref, beautySets, makeup.id, product.id) : undefined;
  const details = Object.entries(product.details ?? {}).filter(([, value]) => typeof value === "string");
  const showFit = ["jacket", "top", "pants", "shoes", "dress", "headwear"].includes(product.tryOnSlot ?? "") &&
    !details.some(([name]) => /size|fit/i.test(name));

  return (
    <>
      <Header active={product.category} query="" />
      <main className={styles.page + " " + styles.detailPage} id="main" tabIndex={-1}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link><Link href={shopHref()}>Shop</Link>
          <Link href={shopHref(product.category)}>{world?.nav ?? product.category}</Link><span aria-current="page">{product.name}</span>
        </nav>
        <div className={styles.backRow}>
          {listing ? <BackLink href={listing + "#" + catalogAnchor(row?.slug ?? id)} label="Back to results" scroll={false} />
            : <BackLink href={shopHref(product.category)} />}
        </div>
        <section className={styles.product} aria-labelledby="product-heading">
          <ProductGallery photos={photos} name={product.name} photographed={photographed} />
          <div className={styles.productCopy}>
            <p className={styles.eyebrow}>{world?.nav ?? product.category}</p>
            <h1 id="product-heading">{product.name}</h1>
            <p className={styles.detailPrice}>{money(price)}</p>
            {product.description && <p className={styles.description}>{product.description}</p>}
            {user && row ? <AccountOptions name={row.name} photographed={photographed} tryOnSet={tryOnSet}
              options={[...(selected ? [selected] : []), ...row.variants.filter(({ id }) => id !== selected?.id)].map(({ options, ...variant }) => {
                const config = options && typeof options === "object" && !Array.isArray(options) ? options : undefined;
                return {
                  ...variant, hex: typeof config?.hex === "string" ? config.hex : undefined,
                  shadeId: tryOnSet ? lipstickShades.find(({ id }) => lipstickVariantKey(id) === config?.key)?.id : undefined,
                };
              })} />
              : fixture ? <ProductOptions product={fixture} tryOnSet={tryOnSet} /> : <Link href="/account" className={styles.sceneLink}>Sign in to add to bag</Link>}
            {scene && sceneHref && <Link href={sceneHref} className={styles.sceneLink}>View in {scene.title} <Icon name="arrow" /></Link>}
            {(details.length > 0 || showFit) && <section className={styles.productInfo} aria-labelledby="product-details-heading">
              <h2 id="product-details-heading">Product details</h2>
              {details.length > 0 && <dl className={styles.details}>{details.map(([name, value]) => (
                <div key={name}><dt>{name}</dt><dd>{String(value)}</dd></div>
              ))}</dl>}
              {showFit && <p>Size and fit details will be available when this product goes on sale.</p>}
            </section>}
            <section className={styles.productInfo} aria-labelledby="delivery-heading">
              <h2 id="delivery-heading">Delivery &amp; returns</h2>
              <p>This is a demo product. Delivery and returns will be available when the store opens.</p>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

