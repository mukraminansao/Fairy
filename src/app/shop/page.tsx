import { BackLink } from "../back-link";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@/server/auth";
import { defaultVariant, shopCatalog } from "@/server/storefront";
import { AccountProductActions } from "../account/product-actions";
import { getProduct, money, products, productVariants, shopHref, worlds } from "../catalog";
import { fashionHref } from "../fashion-data";
import { Header } from "../header";
import { makeupHref } from "../makeup-data";
import { ProductActions } from "../shop-state";
import { Icon } from "../ui-icon";
import { CatalogFilters } from "./catalog-filters";
import { CatalogPosition, CatalogProductLink } from "./catalog-position";
import { productType } from "./product-types";
import styles from "./catalog.module.css";

export const metadata: Metadata = { title: "Shop the Catalog | FAIRY" };

const pageSize = 16;
const prices = [
  { id: "under-35", label: "Under $35", min: 0, max: 3499 },
  { id: "35-75", label: "$35 to $75", min: 3500, max: 7500 },
  { id: "over-75", label: "Over $75", min: 7501, max: Infinity },
];
const sorts = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price, low to high" },
  { id: "price-desc", label: "Price, high to low" },
  { id: "name", label: "Name, A to Z" },
];

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "";
  const world = worlds.find(({ id }) => id === category);
  const isNew = category === "new";
  const active = world?.id ?? (isNew ? "new" : "");
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const price = prices.find(({ id }) => id === params.price);
  const sort = sorts.find(({ id }) => id === params.sort)?.id ?? "featured";
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const [serverCatalog, user] = await Promise.all([shopCatalog(), currentUser()]);
  const catalog = serverCatalog?.map((row) => {
    const variant = defaultVariant(row);
    return { ...row, variant, previewImage: row.images[0]?.path, priceCents: variant?.priceMinor ?? 0 };
  }) ?? products.map((product) => ({ ...product, variant: undefined, slug: product.id }));
  const types = [...new Map(catalog.flatMap((product) => {
    const type = productType(product);
    return type && (!world || product.category === world.id) ? [[type.id, type] as const] : [];
  })).values()].sort((a, b) => a.label.localeCompare(b.label));
  const type = types.find(({ id }) => id === params.type);
  const searchMatches = catalog.filter((product) => {
    const text = [product.name, product.category, product.description, product.sku].join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const matches = searchMatches.filter((product) => (!world || product.category === world.id) &&
    (!type || productType(product)?.id === type.id) &&
    (!price || (product.priceCents >= price.min && product.priceCents <= price.max)));
  if (sort === "price-asc") matches.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === "price-desc") matches.sort((a, b) => b.priceCents - a.priceCents);
  if (sort === "name") matches.sort((a, b) => a.name.localeCompare(b.name, "en"));
  if (sort === "featured" && isNew) matches.reverse();
  const lastPage = Math.max(1, Math.ceil(matches.length / pageSize));
  const requestedPage = typeof params.page === "string" && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.max(1, Math.min(lastPage, requestedPage));
  const start = (page - 1) * pageSize;
  const visible = matches.slice(start, start + pageSize);
  const title = query ? "Search results" : world?.label ?? (isNew ? "New In" : "The FAIRY catalog");

  function filteredHref(nextCategory: string, nextPage = 1, omit?: "q" | "type" | "price" | "sort") {
    const search = new URLSearchParams();
    if (nextCategory) search.set("category", nextCategory);
    if (query && omit !== "q") search.set("q", query);
    if (type && omit !== "type" && (!nextCategory || nextCategory === "new" ||
      catalog.some((product) => product.category === nextCategory && productType(product)?.id === type.id))) search.set("type", type.id);
    if (price && omit !== "price") search.set("price", price.id);
    if (sort !== "featured" && omit !== "sort") search.set("sort", sort);
    if (nextPage > 1) search.set("page", String(nextPage));
    return search.size ? "/shop?" + search : shopHref();
  }

  const listing = filteredHref(active, page);
  const activeFilters = [
    ...(query ? [{ label: "Search: " + query, key: "q" as const }] : []),
    ...(type ? [{ label: type.label, key: "type" as const }] : []),
    ...(price ? [{ label: price.label, key: "price" as const }] : []),
    ...(sort !== "featured" ? [{ label: sorts.find(({ id }) => id === sort)!.label, key: "sort" as const }] : []),
  ];
  const searchWorlds = query ? worlds.filter(({ id }) => searchMatches.some((product) => product.category === id)) : [];
  const suggestions = (searchWorlds.length ? searchWorlds : worlds).filter(({ id }) => id !== active).slice(0, 3);

  return (
    <>
      <CatalogPosition listing={listing} />
      <Header active={active || (query ? "" : "all")} query={query} />
      <main className={styles.page} id="main" tabIndex={-1}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-current="page">Shop</span></nav>
        <section aria-labelledby="catalog-heading">
          <BackLink href="/" />
          <div className={styles.intro}>
            <p className={styles.eyebrow}>The FAIRY edit</p>
            <h1 id="catalog-heading">{title}</h1>
            <p>{query ? <>Results for “{query}”</> : "Discover pieces to wear, layer, and make your own."}</p>
          </div>
          <nav className={styles.categories} aria-label="Catalog categories">
            <Link href={filteredHref("")} aria-current={!active ? "page" : undefined}>All</Link>
            <Link href={filteredHref("new")} aria-current={isNew ? "page" : undefined}>New In</Link>
            {worlds.map(({ id, nav }) => <Link key={id} href={filteredHref(id)} aria-current={active === id ? "page" : undefined}>{nav}</Link>)}
          </nav>
          <CatalogFilters count={activeFilters.length} clearHref={shopHref(active || undefined)}>
            {active && <input type="hidden" name="category" value={active} />}
            <label className={styles.searchField}>Search products<input key={query} name="q" type="search" defaultValue={query} maxLength={100} /></label>
            {types.length > 1 && <label>Product type<select key={(type?.id ?? "") + active} name="type" defaultValue={type?.id ?? ""}>
              <option value="">All product types</option>
              {types.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select></label>}
            <label>Price<select key={price?.id ?? ""} name="price" defaultValue={price?.id ?? ""}>
              <option value="">Any price</option>
              {prices.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select></label>
            <label>Sort by<select key={sort} name="sort" defaultValue={sort}>
              {sorts.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select></label>
          </CatalogFilters>
          {activeFilters.length > 0 && <ul className={styles.activeFilters} aria-label="Active filters">
            {activeFilters.map(({ key, label }) => <li key={key}>
              <Link href={filteredHref(active, 1, key)} aria-label={"Remove filter: " + label}>{label} <Icon name="close" /></Link>
            </li>)}
          </ul>}
          <div className={styles.results}>
            <p>{matches.length} {matches.length === 1 ? "product" : "products"} · Demo prices in USD</p>
            {active === "fashion" && <Link href={fashionHref}>Shop Monochrome Street <Icon name="arrow" /></Link>}
            {active === "makeup" && <Link href={makeupHref}>Shop Soft Rose Edit <Icon name="arrow" /></Link>}
          </div>
          {visible.length ? (
            <ul className={styles.products} aria-label="Catalog products">
              {visible.map((product) => {
                const fixture = getProduct(product.id);
                const defaultOption = fixture ? productVariants(fixture).find(({ key }) => key === product.id) : product.variant;
                return (
                  <li key={product.id}>
                    <CatalogProductLink className={styles.productLink} slug={product.slug} listing={listing}>
                      <div className={styles.cardPhoto}>{product.previewImage && <Image src={product.previewImage} alt="" fill
                        sizes="(max-width: 599px) 48vw, (max-width: 1000px) 32vw, 25vw" />}</div>
                      <h2>{product.name}</h2>
                    </CatalogProductLink>
                    <p className={styles.cardPrice}>{money(product.priceCents)}{defaultOption?.name && <span>{defaultOption.name}</span>}</p>
                    {user && product.variant ? <AccountProductActions name={product.name} variantId={product.variant.id} inStock={product.variant.inStock} card />
                      : fixture ? <ProductActions product={fixture} card /> : <Link href="/account">Sign in to add to bag</Link>}
                  </li>
                );
              })}
            </ul>
          ) : <div className={styles.empty}>
            <h2>No matching products</h2>
            <p>{query || price || type ? "Try a broader search or clear the filters to see more products." : "Explore another category to find something you like."}</p>
            <nav className={styles.categories} aria-label="Explore more products">
              <Link href={query || price || type ? shopHref(active || undefined) : shopHref()}>{query || price || type ? "Reset search and filters" : "Browse all products"}</Link>
              {suggestions.map(({ id, nav }) => <Link key={id}
                href={shopHref(id) + (searchWorlds.length ? "&" + new URLSearchParams({ q: query }) : "")}>{nav}</Link>)}
            </nav>
          </div>}
          {lastPage > 1 && (
            <nav className={styles.pagination} aria-label="Catalog pages">
              {Array.from({ length: lastPage }, (_, index) => index + 1).map((number) => (
                <Link key={number} href={filteredHref(active, number)} aria-label={"Page " + number} aria-current={number === page ? "page" : undefined}>{number}</Link>
              ))}
            </nav>
          )}
        </section>
      </main>
    </>
  );
}
