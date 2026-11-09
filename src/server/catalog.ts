import "server-only";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { ProductCategory, SceneKind } from "../generated/prisma/enums";
import { data, notFound, pageOf, pagination } from "./api";
import { database } from "./database";

export const productQuery = pagination.extend({
  category: z.enum(ProductCategory).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["featured", "name", "price-asc", "price-desc"]).default("featured"),
});
export const sceneQuery = pagination.extend({ kind: z.enum(SceneKind).optional() });

export const publicProductInclude = {
  images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
  variants: { where: { isActive: true }, orderBy: { sku: "asc" }, include: { inventory: true } },
} satisfies Prisma.ProductInclude;

type PublicRow = Prisma.ProductGetPayload<{ include: typeof publicProductInclude }>;

export function toPublicProduct(row: PublicRow) {
  return {
    id: row.id, slug: row.slug, sku: row.sku, name: row.name, description: row.description,
    category: row.category.toLowerCase(), currency: row.currency, tryOnSlot: row.tryOnSlot,
    details: row.details, demoOnly: row.demoOnly,
    images: row.images.map(({ path, alt }) => ({ path, alt })),
    variants: row.variants.map(({ id, sku, name, options, priceMinor, currency, inventory }) => ({
      id, sku, name, options, priceMinor, currency, inStock: Boolean(inventory && inventory.onHand > inventory.reserved),
    })),
  };
}

const availableProducts = { status: "ACTIVE", variants: { some: { isActive: true } } } as const;

export async function listProducts(query: z.infer<typeof productQuery>) {
  const words = query.q?.split(/\s+/).filter(Boolean) ?? [];
  const rows = await database().product.findMany({
    where: {
      ...availableProducts,
      category: query.category,
      AND: words.map((word) => ({
        OR: ["name", "description", "sku"].map((field) => ({ [field]: { contains: word, mode: "insensitive" } })),
      })),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: publicProductInclude,
  });
  const prices = (row: PublicRow) => Math.min(...row.variants.map((variant) => variant.priceMinor));
  if (query.sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id));
  if (query.sort === "price-asc") rows.sort((a, b) => prices(a) - prices(b) || a.id.localeCompare(b.id));
  if (query.sort === "price-desc") rows.sort((a, b) => prices(b) - prices(a) || a.id.localeCompare(b.id));
  const { results, nextCursor } = pageOf(rows, query.limit, query.cursor);
  return data(results.map(toPublicProduct), 200, { nextCursor, count: rows.length });
}

export async function readProduct(slug: string) {
  const row = await database().product.findFirst({ where: { ...availableProducts, slug }, include: publicProductInclude });
  return row ? data(toPublicProduct(row)) : notFound();
}

export async function listCategories() {
  const groups = await database().product.groupBy({ by: ["category"], where: availableProducts, _count: { _all: true } });
  return data(Object.values(ProductCategory).map((category) => ({
    slug: category.toLowerCase(), count: groups.find((group) => group.category === category)?._count._all ?? 0,
  })));
}

function sceneCard(row: { id: string; slug: string; title: string; subtitle: string | null; kind: string; imagePath: string; imageWidth: number; imageHeight: number }) {
  return {
    id: row.id, slug: row.slug, title: row.title, subtitle: row.subtitle, kind: row.kind.toLowerCase(),
    image: row.imagePath, imageSize: [row.imageWidth, row.imageHeight],
  };
}

export async function listScenes(query: z.infer<typeof sceneQuery>) {
  const rows = await database().scene.findMany({
    where: { isPublished: true, kind: query.kind }, orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  const { results, nextCursor } = pageOf(rows, query.limit, query.cursor);
  return data(results.map(sceneCard), 200, { nextCursor, count: rows.length });
}

export async function readScene(slug: string) {
  const row = await database().scene.findFirst({
    where: { slug, isPublished: true },
    include: {
      hotspots: {
        where: { product: availableProducts }, orderBy: [{ position: "asc" }, { id: "asc" }],
        include: { product: { include: publicProductInclude } },
      },
    },
  });
  if (!row) return notFound();
  const defaultSelectedProductId = row.hotspots.find(({ productId }) => productId === row.defaultSelectedProductId)?.productId ??
    row.hotspots[0]?.productId ?? null;
  return data({
    ...sceneCard(row), photoCrop: row.photoCrop, defaultSelectedProductId,
    hotspots: row.hotspots.map(({ productId, rect, shape, priority, product }) =>
      ({ productId, rect, shape, priority, product: toPublicProduct(product) })),
  });
}
