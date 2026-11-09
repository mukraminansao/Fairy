import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import catalog from "../data/catalog.json";
import scenes from "../data/scenes.json";
import { productVariants } from "../src/app/catalog";
import { PrismaClient } from "../src/generated/prisma/client";
import type { ProductCategory, SceneKind } from "../src/generated/prisma/enums";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL for the isolated FAIRY development database.");
const target = new URL(connectionString);
if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !/^\/fairy_(dev|test)(_[a-z0-9]+)?$/.test(target.pathname)) {
  throw new Error("Fixture seeding requires a loopback database named fairy_dev or fairy_test.");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seed() {
  await db.$transaction(async (tx) => {
    for (const product of catalog.products) {
      await tx.product.upsert({
        where: { id: product.id },
        update: {},
        create: {
          id: product.id, slug: product.id, sku: product.sku, name: product.name,
          description: product.description, category: product.category.toUpperCase() as ProductCategory,
          status: "ACTIVE", currency: catalog.currency, demoOnly: true, tryOnSlot: product.tryOnSlot,
          details: product.details,
        },
      });
      await tx.productImage.upsert({
        where: { productId_path: { productId: product.id, path: product.previewImage } },
        update: {},
        create: { productId: product.id, path: product.previewImage, alt: product.name + " close-up" },
      });
      for (const variant of productVariants(product)) {
        const id = "variant-" + (variant.key === product.id ? product.id + "-default" : variant.key.replace(":", "-"));
        await tx.productVariant.upsert({
          where: { id }, update: {},
          create: {
            id, productId: product.id, sku: variant.sku, name: variant.name ?? "Standard",
            options: { key: variant.key, ...(variant.hex ? { hex: variant.hex } : {}) },
            priceMinor: product.priceCents, currency: catalog.currency,
          },
        });
        await tx.inventory.upsert({
          where: { variantId: id }, update: {}, create: { variantId: id, onHand: variant.stock },
        });
      }
    }
    for (const [position, scene] of scenes.scenes.entries()) {
      await tx.scene.upsert({
        where: { id: scene.id }, update: {},
        create: {
          id: scene.id, slug: scene.id, title: scene.title, subtitle: scene.subtitle, position,
          kind: scene.kind.toUpperCase() as SceneKind, imagePath: scene.image,
          imageWidth: scene.imageSize[0], imageHeight: scene.imageSize[1],
          photoCrop: "photoCrop" in scene ? scene.photoCrop : undefined,
          defaultSelectedProductId: scene.defaultSelectedProductId,
        },
      });
      for (const [index, spot] of scene.hotspots.entries()) {
        await tx.hotspot.upsert({
          where: { sceneId_productId: { sceneId: scene.id, productId: spot.productId } }, update: {},
          create: {
            sceneId: scene.id, productId: spot.productId, rect: spot.rect, position: index,
            priority: spot.priority, shape: "shape" in spot && typeof spot.shape === "string" ? spot.shape : undefined,
          },
        });
      }
    }
    const email = process.env.FAIRY_DEV_EMAIL?.trim().toLowerCase();
    if (email?.endsWith("@fairy.test")) {
      await tx.user.upsert({ where: { email }, update: {}, create: { email, name: "FAIRY test customer" } });
    }
  }, { timeout: 30000 });
  console.log("Seeded " + catalog.products.length + " catalog products and " + scenes.scenes.length + " scenes.");
}

seed().catch(() => {
  console.error("FAIRY seed failed. Check that migrations are deployed and that the local PostgreSQL instance is reachable.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
