import "server-only";
import type { LookSet } from "../app/look-sets";
import { products } from "../app/catalog";
import { publicProductInclude, toPublicProduct } from "./catalog";
import { database, databaseConfigured } from "./database";

const fixturePosition = new Map(products.map(({ id }, index) => [id, index]));
const active = { status: "ACTIVE", variants: { some: { isActive: true } } } as const;

export async function shopCatalog() {
  if (!databaseConfigured()) return null;
  const rows = await database().product.findMany({
    where: active, include: publicProductInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  rows.sort((a, b) => (fixturePosition.get(a.id) ?? Infinity) - (fixturePosition.get(b.id) ?? Infinity));
  return rows.map(toPublicProduct);
}

export async function shopProduct(slug: string) {
  if (!databaseConfigured()) return undefined;
  const row = await database().product.findFirst({ where: { slug, ...active }, include: publicProductInclude });
  return row ? toPublicProduct(row) : null;
}

export type StoreProduct = ReturnType<typeof toPublicProduct>;
export function defaultVariant(product: StoreProduct) {
  return product.variants.find(({ options }) => options && typeof options === "object" && !Array.isArray(options) && options.key === product.id) ?? product.variants[0];
}


export async function publishedLookSets(kind: "FASHION" | "BEAUTY", fixtures: readonly LookSet[]): Promise<readonly LookSet[]> {
  if (!databaseConfigured()) return fixtures;
  const rows = await database().scene.findMany({
    where: { kind, isPublished: true, id: { in: fixtures.map(({ id }) => id) } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { hotspots: { where: { product: active }, orderBy: [{ position: "asc" }, { id: "asc" }] } },
  });
  return rows.flatMap((row) => {
    const fixture = fixtures.find(({ id }) => id === row.id);
    if (!fixture) return [];
    const hotspots = row.hotspots.flatMap(({ productId, rect, shape, priority }) => {
      if (!fixturePosition.has(productId) || !Array.isArray(rect) || rect.length !== 4 || !rect.every((part) => typeof part === "number")) return [];
      const bounds = rect as [number, number, number, number];
      const [x, y, width, height] = bounds;
      return [{ productId, rect: bounds, shape: shape ?? `M${x} ${y}h${width}v${height}h-${width}Z`, priority }];
    });
    if (!hotspots.length) return [];
    const itemIds = hotspots.map(({ productId }) => productId);
    const crop = row.photoCrop;
    return [{
      id: row.id, title: row.title, description: row.subtitle ?? fixture.description, image: row.imagePath,
      imageSize: [row.imageWidth, row.imageHeight],
      photoCrop: Array.isArray(crop) && crop.length === 2 && crop.every((part) => typeof part === "number") ? crop as [number, number] : undefined,
      hotspots, itemIds, defaultItemId: row.defaultSelectedProductId && itemIds.includes(row.defaultSelectedProductId) ? row.defaultSelectedProductId : itemIds[0],
    }];
  });
}
