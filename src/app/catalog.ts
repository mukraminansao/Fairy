import catalog from "../../data/catalog.json";

export const products = catalog.products;
export type Product = (typeof products)[number];
const byId = new Map(products.map((product) => [product.id, product]));
export const getProduct = (id: string) => byId.get(id);
export const pendantFinishes = { black: "Black inlay", silver: "Silver finish" } as const;

export const worlds = [
  { id: "fashion", label: "Fashion & Outfits", nav: "Fashion", image: "/assets/homepage/fashion.webp", alt: "Monochrome track jacket and streetwear accessories" },
  { id: "makeup", label: "Makeup", nav: "Makeup", image: "/assets/homepage/makeup.webp", alt: "Two satin lipsticks and an open rose blush compact" },
  { id: "skincare", label: "Skincare", nav: "Skincare", image: "/assets/homepage/skincare.webp", alt: "FAIRY serum, essence, and cream" },
  { id: "accessories", label: "Accessories", nav: "Accessories", image: "/assets/homepage/accessories.webp", alt: "Silver cross pendant, sunglasses, and a silver bracelet" },
  { id: "fragrance", label: "Fragrance", nav: "Fragrance", image: "/assets/homepage/fragrance.webp", alt: "No. 03 Eau de Parfum beside a white lily" },
];

export const looksHref = "/looks";

export function shopHref(category?: string) {
  return category ? "/shop?" + new URLSearchParams({ category }) : "/shop";
}

export function productHref(id: string) {
  return "/shop/" + encodeURIComponent(id);
}

export function worldHref(id: string) {
  return id === "looks" ? looksHref : shopHref(id);
}

type VariantOption = { id: string; name: string; hex?: string };
const inventory: Readonly<Record<string, number>> = catalog.demoInventory.quantities;

function makeVariant(product: Product, option?: VariantOption, defaultId?: string) {
  const key = !option || option.id === defaultId ? product.id : product.id + ":" + option.id;
  return {
    key, name: option?.name, hex: option?.hex,
    sku: key === product.id ? product.sku : product.sku + "-" + option?.id.toUpperCase(),
    stock: inventory[key] ?? catalog.demoInventory.defaultQuantity,
  };
}

export function productVariants(product: Product) {
  if (product.id === "f-pendant") {
    return Object.entries(pendantFinishes).map(([id, name]) => makeVariant(product, { id, name }, "black"));
  }
  if (product.shades?.length) {
    return product.shades.map((shade) => makeVariant(product, shade, "soft-mocha"));
  }
  return [makeVariant(product)];
}

export function catalogLine(key: string) {
  const product = getProduct(key.split(":")[0]);
  if (!product) return undefined;
  const variant = productVariants(product).find((option) => option.key === key);
  return variant && { product, variant };
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: catalog.currency });

export function formatPrice(minor: number, currencyCode: string) {
  return currencyCode === catalog.currency ? currency.format(minor / 100)
    : new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(minor / 100);
}

export function money(cents: number) {
  return currency.format(cents / 100);
}
