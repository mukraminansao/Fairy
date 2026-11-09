import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { ProductCategory, ProductStatus } from "../generated/prisma/enums";
import { ApiError, identifier, notFound, pageOf } from "./api";
import { database } from "./database";

const name = z.string().trim().min(1).max(120);
const sku = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const priceMinor = z.number().int().min(0).max(100000000);
const product = z.object({
  sku, name, description: z.string().trim().max(3000).optional(),
  category: z.enum(ProductCategory), status: z.enum(ProductStatus).optional(),
}).strict();
export const newProduct = product.extend({ slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });
export const productPatch = product.partial().refine((value) => Object.keys(value).length > 0);
const variant = z.object({ sku, name, priceMinor, isActive: z.boolean().optional() }).strict();
export const newVariant = variant;
export const variantPatch = variant.partial().refine((value) => Object.keys(value).length > 0);
export const stockPatch = z.object({ onHand: z.number().int().min(0).max(1000000), reason: z.string().trim().min(1).max(160) }).strict();
const coordinate = z.number().min(0).max(50000);
const hotspot = z.object({
  productId: identifier,
  rect: z.tuple([coordinate, coordinate, coordinate.positive(), coordinate.positive()]),
  shape: z.string().max(6000).regex(/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/).optional(),
  priority: z.number().int().min(0).max(100).default(0),
}).strict();
export const scenePatch = z.object({
  title: name.optional(), subtitle: z.string().trim().max(400).nullable().optional(),
  isPublished: z.boolean().optional(), defaultSelectedProductId: identifier.nullable().optional(),
  hotspots: z.array(hotspot).min(1).max(50).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

const adminInclude = { variants: { orderBy: { sku: "asc" }, include: { inventory: true } }, images: { orderBy: { sortOrder: "asc" } } } satisfies Prisma.ProductInclude;
function audit(tx: Prisma.TransactionClient, actorId: string, action: string, targetType: string, targetId: string, details?: Prisma.InputJsonObject) {
  return tx.auditLog.create({ data: { actorId, action, targetType, targetId, details } });
}

export async function adminProducts(limit: number, cursor?: string) {
  const rows = await database().product.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }], include: adminInclude });
  return pageOf(rows, limit, cursor);
}

export async function createProduct(actor: string, input: z.infer<typeof newProduct>) {
  return database().$transaction(async (tx) => {
    const row = await tx.product.create({ data: { id: input.slug, ...input } });
    await audit(tx, actor, "PRODUCT_CREATED", "Product", row.id);
    return row;
  });
}

export async function updateProduct(actor: string, id: string, input: z.infer<typeof productPatch>) {
  return database().$transaction(async (tx) => {
    const row = await tx.product.update({ where: { id }, data: input });
    await audit(tx, actor, "PRODUCT_UPDATED", "Product", row.id, { fields: Object.keys(input) });
    return row;
  });
}

export async function createVariant(actor: string, productId: string, input: z.infer<typeof newVariant>) {
  return database().$transaction(async (tx) => {
    const parent = await tx.product.findUnique({ where: { id: productId }, select: { currency: true } });
    if (!parent) return notFound();
    const row = await tx.productVariant.create({
      data: { ...input, id: randomUUID(), productId, currency: parent.currency, inventory: { create: {} } },
    });
    await audit(tx, actor, "VARIANT_CREATED", "ProductVariant", row.id);
    return row;
  });
}

export async function updateVariant(actor: string, id: string, input: z.infer<typeof variantPatch>) {
  return database().$transaction(async (tx) => {
    const row = await tx.productVariant.update({ where: { id }, data: input });
    await audit(tx, actor, "VARIANT_UPDATED", "ProductVariant", row.id, { fields: Object.keys(input) });
    return row;
  });
}

export async function updateStock(actor: string, variantId: string, input: z.infer<typeof stockPatch>) {
  return database().$transaction(async (tx) => {
    const existing = await tx.inventory.findUnique({ where: { variantId } });
    if (!existing) return notFound();
    if (input.onHand < existing.reserved) throw new ApiError(409, "STOCK_RESERVED", "On-hand stock cannot be lower than reserved stock.");
    const row = await tx.inventory.update({ where: { variantId }, data: { onHand: input.onHand } });
    await audit(tx, actor, "INVENTORY_UPDATED", "Inventory", row.id, { variantId, from: existing.onHand, to: row.onHand, reason: input.reason });
    return row;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateScene(actor: string, id: string, input: z.infer<typeof scenePatch>) {
  return database().$transaction(async (tx) => {
    const scene = await tx.scene.findUnique({ where: { id }, include: { hotspots: true } });
    if (!scene) return notFound();
    const { hotspots, ...fields } = input;
    const ids = (hotspots ?? scene.hotspots).map(({ productId }) => productId);
    const defaultId = fields.defaultSelectedProductId === undefined ? scene.defaultSelectedProductId : fields.defaultSelectedProductId;
    if (hotspots) {
      if (new Set(ids).size !== ids.length || hotspots.some(({ rect: [x,y,w,h] }) => x + w > scene.imageWidth || y + h > scene.imageHeight)) {
        throw new ApiError(422, "INVALID_HOTSPOTS", "Each hotspot needs a distinct product and a rectangle inside the image.");
      }
      if (await tx.product.count({ where: { id: { in: ids }, status: "ACTIVE" } }) !== ids.length) {
        throw new ApiError(422, "INVALID_HOTSPOTS", "Hotspots must point to active products.");
      }
    }
    if (defaultId && !ids.includes(defaultId)) throw new ApiError(422, "INVALID_DEFAULT", "The selected product needs a hotspot.");
    const row = await tx.scene.update({
      where: { id }, data: {
        ...fields,
        ...(hotspots ? { hotspots: { deleteMany: {}, create: hotspots.map((entry, position) => ({ ...entry, position })) } } : {}),
      }, include: { hotspots: { orderBy: { position: "asc" } } },
    });
    await audit(tx, actor, "SCENE_UPDATED", "Scene", id, { fields: Object.keys(input) });
    return row;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listAudit(limit: number, cursor?: string) {
  const anchor = cursor ? await database().auditLog.findUnique({ where: { id: cursor }, select: { createdAt: true } }) ?? notFound() : null;
  const rows = await database().auditLog.findMany({
    where: anchor ? { OR: [
      { createdAt: { lt: anchor.createdAt } },
      { createdAt: { equals: anchor.createdAt }, id: { lt: cursor } },
    ] } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1,
  });
  return pageOf(rows, limit);
}

