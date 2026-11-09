import "server-only";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { catalogLine } from "../app/catalog";
import { beautyArea, defaultShade, lipstickId, tryOnPalette } from "../app/makeup-data";
import { maxBrush, maxBrushPoints, maxStrokes, minBrush } from "../app/contour-sketch";
import { LookKind } from "../generated/prisma/enums";
import { ApiError, data, identifier, notFound, pageOf } from "./api";
import { database } from "./database";
import { publicProductInclude, toPublicProduct } from "./catalog";

type Tx = Prisma.TransactionClient;

async function transaction<T>(action: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await database().$transaction(action, { isolationLevel: "Serializable" });
    } catch (error) {
      if (attempt >= 2 || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034") throw error;
    }
  }
}

export const reviewKeys = z.array(z.string().max(150)).min(1).max(100);
export const reviewSelection = z.object({ keys: reviewKeys }).strict();
export const replaceOption = z.object({ variantId: z.string().min(1).max(150) }).strict();

export const cartQuantity = z.object({ quantity: z.number().int().min(1).max(20) }).strict();
export const restoreCartOption = cartQuantity.extend({ variantId: z.string().min(1).max(150) });

async function cartSnapshot(db: Tx, userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: { items: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { variant: { include: { product: { include: { variants: { where: { isActive: true }, orderBy: { name: "asc" }, include: { inventory: true } } } }, inventory: true } } } } },
  });
  const items = cart?.items.map(({ variant, quantity }) => {
    const inventory = variant.inventory;
    const options = variant.product.status === "ACTIVE" ? variant.product.variants.map((option) => ({
      id: option.id, name: option.name, priceMinor: option.priceMinor,
      capacity: Math.max(0, Math.min(20, (option.inventory?.onHand ?? 0) - (option.inventory?.reserved ?? 0))),
    })) : [];
    return {
      options,
      variantId: variant.id, productId: variant.productId, productName: variant.product.name,
      variantName: variant.name, quantity, unitPriceMinor: variant.priceMinor,
      currency: variant.currency, lineTotalMinor: variant.priceMinor * quantity,
      available: variant.isActive && variant.product.status === "ACTIVE" &&
        Boolean(inventory && inventory.onHand - inventory.reserved >= quantity),
    };
  }) ?? [];
  const currency = items[0]?.currency ?? "USD";
  if (items.some((item) => item.currency !== currency)) {
    throw new ApiError(409, "CURRENCY_MISMATCH", "Your cart contains products in different currencies.");
  }
  return { items, currency, subtotalMinor: items.reduce((sum, item) => sum + item.lineTotalMinor, 0), isDemo: true };
}

export async function readCart(userId: string) {
  return cartSnapshot(database(), userId);
}

export async function putCartItem(userId: string, variantId: string, requestedQuantity: number, increment = false) {
  return transaction(async (tx) => {
    const variant = await tx.productVariant.findFirst({
      where: { id: variantId, isActive: true, product: { status: "ACTIVE" } }, include: { inventory: true },
    });
    if (!variant) return notFound();
    const stock = variant.inventory ? variant.inventory.onHand - variant.inventory.reserved : 0;
    const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    const key = { cartId_variantId: { cartId: cart.id, variantId } };
    const previous = increment ? await tx.cartItem.findUnique({ where: key, select: { quantity: true } }) : null;
    const quantity = requestedQuantity + (previous?.quantity ?? 0);
    if (quantity > 20) throw new ApiError(422, "CART_LIMIT", "The bag allows up to 20 of each variant.");
    if (quantity > stock) throw new ApiError(409, "INSUFFICIENT_STOCK", "There is not enough stock for that quantity.");
    await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      update: { quantity }, create: { cartId: cart.id, variantId, quantity },
    });
    return cartSnapshot(tx, userId);
  });
}

async function reviewOptions(tx: Tx, userId: string, keys: string[]) {
  const skuByKey = new Map([...new Set(keys)].flatMap((key) => {
    const line = catalogLine(key);
    return line ? [[key, line.variant.sku] as const] : [];
  }));
  const [variants, cart] = await Promise.all([
    tx.productVariant.findMany({
      where: { sku: { in: [...skuByKey.values()] }, isActive: true, product: { status: "ACTIVE" } },
      include: { inventory: true },
    }),
    cartSnapshot(tx, userId),
  ]);
  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
  const quantities = new Map(cart.items.map(({ variantId, quantity }) => [variantId, quantity]));
  return [...skuByKey].flatMap(([key, sku]) => {
    const variant = bySku.get(sku);
    if (!variant) return [];
    const stock = (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0);
    return [{ key, variantId: variant.id, priceMinor: variant.priceMinor, currency: variant.currency,
      available: (quantities.get(variant.id) ?? 0) < Math.min(20, stock) && (!cart.items.length || cart.currency === variant.currency) }];
  });
}

export async function quoteLook(userId: string, keys: string[]) {
  return reviewOptions(database(), userId, keys);
}

export async function addReviewedLook(userId: string, keys: string[]) {
  return transaction(async (tx) => {
    const selected = new Set(keys);
    const options = await reviewOptions(tx, userId, keys);
    if (options.length !== selected.size || options.some(({ available }) => !available) ||
      new Set(options.map(({ currency }) => currency)).size > 1) {
      throw new ApiError(409, "INSUFFICIENT_STOCK", "Some options have changed. Review the available items and try again.");
    }
    const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    for (const { variantId } of options) {
      await tx.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId } },
        update: { quantity: { increment: 1 } }, create: { cartId: cart.id, variantId, quantity: 1 } });
    }
    return [...selected];
  });
}

export async function changeCartOption(userId: string, from: string, to: string) {
  if (from === to) return readCart(userId);
  return transaction(async (tx) => {
    const current = await tx.cartItem.findFirst({
      where: { variantId: from, cart: { userId } }, include: { variant: true },
    });
    if (!current) return notFound();
    const option = await tx.productVariant.findFirst({
      where: { id: to, productId: current.variant.productId, currency: current.variant.currency, isActive: true, product: { status: "ACTIVE" } },
      include: { inventory: true },
    });
    if (!option) return notFound();
    const key = { cartId_variantId: { cartId: current.cartId, variantId: to } };
    const existing = await tx.cartItem.findUnique({ where: key, select: { quantity: true } });
    const quantity = current.quantity + (existing?.quantity ?? 0);
    const stock = (option.inventory?.onHand ?? 0) - (option.inventory?.reserved ?? 0);
    if (quantity > Math.min(20, stock)) {
      throw new ApiError(409, "INSUFFICIENT_STOCK", "That option does not have enough stock for this quantity.");
    }
    await tx.cartItem.upsert({ where: key, update: { quantity },
      create: { cartId: current.cartId, variantId: to, quantity } });
    await tx.cartItem.delete({ where: { id: current.id } });
    return cartSnapshot(tx, userId);
  });
}

export async function readLook(userId: string, id: string) {
  const row = await database().savedLook.findUnique({ where: { id, userId }, include: lookInclude });
  return row ? lookDto(row) : notFound();
}

export async function deleteCartItem(userId: string, variantId: string) {
  await database().cartItem.deleteMany({ where: { variantId, cart: { userId } } });
}

export async function readWishlist(userId: string) {
  const rows = await database().wishlistItem.findMany({
    where: { userId, product: { status: "ACTIVE" } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { product: { include: publicProductInclude } },
  });
  return rows.map(({ product }) => toPublicProduct(product));
}

export async function putWishlistItem(userId: string, productId: string) {
  return transaction(async (tx) => {
    const exists = await tx.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
    if (!exists) return notFound();
    await tx.wishlistItem.upsert({ where: { userId_productId: { userId, productId } }, update: {}, create: { userId, productId } });
    return { productId, saved: true };
  });
}

export async function deleteWishlistItem(userId: string, productId: string) {
  await database().wishlistItem.deleteMany({ where: { userId, productId } });
}

const contourAmount = z.number().int().min(0).max(100).optional();
const brushCoordinate = z.number().int().min(0).max(1000);
const contourSketch = z.object({
  blend: z.number().int().min(0).max(100),
  strokes: z.array(z.object({
    size: z.number().int().min(minBrush).max(maxBrush),
    points: z.array(z.tuple([brushCoordinate, brushCoordinate])).min(1).max(maxBrushPoints),
  }).strict()).max(maxStrokes),
}).strict();
const lookItem = z.object({
  variantId: identifier,
  configuration: z.object({
    shadeId: identifier.optional(), slot: identifier.optional(),
    intensity: z.number().int().min(0).max(100).optional(),
    contourPlacement: z.object({ cheekbones: contourAmount, lowerCheeks: contourAmount, nose: contourAmount }).strict().optional(),
    contourSketch: contourSketch.optional(),
    finish: z.enum(["matte", "satin", "gloss", "Matte", "Satin", "Gloss"]).optional(),
  }).strict().optional(),
}).strict();
const lookName = z.string().trim().min(1).max(80);
const lookItems = z.array(lookItem).min(1).max(36);
export const newLook = z.object({ name: lookName, kind: z.enum(LookKind), items: lookItems }).strict();
export const editLook = z.object({ name: lookName.optional(), items: lookItems.optional() }).strict()
  .refine((value) => value.name !== undefined || value.items !== undefined, "Provide a name or a new item list.");

const lookInclude = {
  items: { orderBy: { position: "asc" }, include: { variant: { include: { product: true } } } },
} satisfies Prisma.SavedLookInclude;

function lookDto(row: Prisma.SavedLookGetPayload<{ include: typeof lookInclude }>) {
  return {
    id: row.id, name: row.name, kind: row.kind, createdAt: row.createdAt, updatedAt: row.updatedAt,
    items: row.items.map(({ variant, configuration, position }) => ({
      variantId: variant.id, productId: variant.productId, productName: variant.product.name,
      variantName: variant.name, configuration, position,
    })),
  };
}

async function validateLookItems(tx: Tx, items: z.infer<typeof lookItems>, kind: "FASHION" | "BEAUTY") {
  const variants = await tx.productVariant.findMany({
    where: { id: { in: items.map(({ variantId }) => variantId) }, isActive: true, product: { status: "ACTIVE" } },
    include: { product: { include: { hotspots: { include: { scene: true } } } } },
  });
  if (variants.length !== items.length || new Set(variants.map(({ productId }) => productId)).size !== items.length ||
    variants.some(({ product }) => !product.hotspots.some(({ scene }) => scene.kind === kind && scene.isPublished))) {
    throw new ApiError(422, "INVALID_LOOK_ITEMS", "Choose distinct products from an active set that matches the look.");
  }
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  return items.map((item, position) => {
    const variant = byId.get(item.variantId)!;
    const config = item.configuration;
    if (config?.slot && config.slot !== variant.product.tryOnSlot) {
      throw new ApiError(422, "INVALID_LOOK_SLOT", "The selected slot does not match this product.");
    }
    if ((config?.contourPlacement || config?.contourSketch) && (kind !== "BEAUTY" || beautyArea(variant.productId) !== "contour")) {
      throw new ApiError(422, "INVALID_CONTOUR_PLACEMENT", "Contour placement applies only to contour products.");
    }
    if (config?.shadeId) {
      const options = variant.options;
      const key = options && typeof options === "object" && !Array.isArray(options) && typeof options.key === "string" ? options.key : "";
      const valid = variant.productId === lipstickId ? (key.split(":")[1] ?? defaultShade.id) === config.shadeId
        : tryOnPalette(variant.productId)?.some(({ id }) => id === config.shadeId);
      if (!valid) throw new ApiError(422, "INVALID_SHADE", "The shade does not match the selected product and variant.");
    }
    return { ...item, position };
  });
}

export async function listLooks(userId: string, limit = 20, cursor?: string) {
  const rows = await database().savedLook.findMany({
    where: { userId }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], include: lookInclude,
  });
  const { results, nextCursor } = pageOf(rows, limit, cursor);
  return { results: results.map(lookDto), nextCursor };
}

export async function createLook(userId: string, input: z.infer<typeof newLook>) {
  return transaction(async (tx) => {
    const items = await validateLookItems(tx, input.items, input.kind);
    return lookDto(await tx.savedLook.create({
      data: { userId, name: input.name, kind: input.kind, items: { create: items } }, include: lookInclude,
    }));
  });
}

export async function updateLook(userId: string, id: string, input: z.infer<typeof editLook>) {
  return transaction(async (tx) => {
    const current = await tx.savedLook.findUnique({ where: { id, userId }, select: { kind: true } });
    if (!current) return notFound();
    const items = input.items && await validateLookItems(tx, input.items, current.kind);
    return lookDto(await tx.savedLook.update({
      where: { id, userId },
      data: { name: input.name, items: items ? { deleteMany: {}, create: items } : undefined },
      include: lookInclude,
    }));
  });
}

export async function deleteLook(userId: string, id: string) {
  const result = await database().savedLook.deleteMany({ where: { id, userId } });
  if (!result.count) notFound();
}

export async function looksResponse(userId: string, limit: number, cursor?: string) {
  const { results, nextCursor } = await listLooks(userId, limit, cursor);
  return data(results, 200, { nextCursor });
}

