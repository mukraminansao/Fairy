import { expect, request as requestFactory, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "../src/generated/prisma/client";

const base = process.env.AUTH_URL!;
const variantId = "variant-f-pendant-default";
const cartUrl = "/api/v1/cart/items/" + variantId;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

test.afterAll(() => db.$disconnect());

test("public catalog and scenes expose published data and exact hotspot geometry", async ({ request }) => {
  const page = await request.get("/api/v1/products?category=makeup&limit=2&sort=price-asc");
  expect(page.status()).toBe(200);
  const { data, meta } = await page.json();
  expect(data).toHaveLength(2);
  expect(data.every((p: { category: string }) => p.category === "makeup")).toBe(true);
  expect(data[0].variants[0]).not.toHaveProperty("inventory");
  const next = await request.get("/api/v1/products?category=makeup&limit=2&sort=price-asc&cursor=" + meta.nextCursor);
  expect((await next.json()).data[0].id).not.toBe(data[0].id);
  expect((await request.get("/api/v1/categories")).ok()).toBeTruthy();
  expect((await request.get("/api/v1/products/no-such-product")).status()).toBe(404);
  expect((await request.get("/api/v1/products?limit=51")).status()).toBe(422);
  const scene = (await (await request.get("/api/v1/scenes/monochrome-street")).json()).data;
  expect(scene.imageSize).toEqual([736, 1308]);
  expect(scene.hotspots.find((h: { productId: string }) => h.productId === "f-pendant").rect).toEqual([597, 483, 91, 177]);
  expect((await request.get("/api/v1/scenes?kind=beauty")).ok()).toBeTruthy();
  expect((await request.get("/api/v1/scenes/not-a-scene")).status()).toBe(404);
  expect((await request.get("/api/v1/cart")).status()).toBe(401);
  expect((await request.post("/api/v1/looks", { data: {} })).status()).toBe(401);
  expect((await request.patch("/api/v1/admin/inventory/" + variantId, { data: {} })).status()).toBe(401);
});

test("account ownership, server pricing, stock checks, permissions and audit trail", async () => {
  const suffix = randomUUID().slice(0, 8);
  const [buyer, other, staff, admin] = await Promise.all((["CUSTOMER", "CUSTOMER", "STAFF", "ADMIN"] as const).map((role, index) =>
    db.user.create({ data: { email: index + "-" + suffix + "@fairy.test", role } })));
  const actors = [buyer, other, staff, admin];
  const cookie = "authjs.session-token";
  const clients = await Promise.all(actors.map(async ({ id }) => requestFactory.newContext({
    baseURL: base,
    extraHTTPHeaders: { Origin: base, Cookie: cookie + "=" + await encode({ token: { sub: id }, secret: process.env.AUTH_SECRET!, salt: cookie, maxAge: 1800 }) },
  })));
  const [mine, theirs, reader, editor] = clients;
  const original = await db.productVariant.findUniqueOrThrow({ where: { id: variantId }, include: { inventory: true } });
  const draftId = "qa-draft-" + suffix;
  try {
    expect((await mine.get("/api/v1/me")).status()).toBe(200);
    expect((await mine.get("/api/v1/admin/products")).status()).toBe(403);
    expect((await reader.get("/api/v1/admin/products")).status()).toBe(200);
    expect((await reader.patch("/api/v1/admin/inventory/" + variantId, { data: { onHand: 2, reason: "Permission check" } })).status()).toBe(403);
    expect((await reader.get("/api/v1/admin/audit")).status()).toBe(403);
    expect((await mine.put(cartUrl, { headers: { Origin: "https://example.test" }, data: { quantity: 2 } })).status()).toBe(403);
    expect((await mine.put(cartUrl, { data: { quantity: 2, priceMinor: 1, userId: other.id } })).status()).toBe(422);
    expect((await mine.put(cartUrl, { data: { quantity: 21 } })).status()).toBe(422);
    expect((await mine.put("/api/v1/cart/items/no-such-variant", { data: { quantity: 2 } })).status()).toBe(404);
    const stock = await editor.patch("/api/v1/admin/inventory/" + variantId, { data: { onHand: 2, reason: "Local test stock limit" } });
    expect(stock.status()).toBe(200);
    expect((await mine.put(cartUrl, { data: { quantity: 3 } })).status()).toBe(409);
    expect((await mine.put(cartUrl, { data: { quantity: 2 } })).status()).toBe(200);
    const cart = await mine.put(cartUrl, { data: { quantity: 2 } });
    expect((await cart.json()).data).toMatchObject({ subtotalMinor: original.priceMinor * 2, items: [{ quantity: 2 }] });
    expect((await mine.post(cartUrl)).status()).toBe(409);
    const reviewed = "/api/v1/cart/look";
    const quote = await mine.get(reviewed + "?option=f-pendant&option=f-pendant:silver");
    expect((await quote.json()).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "f-pendant", available: false }),
      expect.objectContaining({ key: "f-pendant:silver", available: true }),
    ]));
    expect((await mine.post(reviewed, { data: { keys: ["f-pendant", "f-pendant:silver"] } })).status()).toBe(409);
    expect((await theirs.patch(cartUrl, { data: { variantId: "variant-f-pendant-silver" } })).status()).toBe(404);
    expect((await mine.post(reviewed, { data: { keys: ["f-pendant:silver"] } })).status()).toBe(201);
    expect((await (await mine.get("/api/v1/cart")).json()).data.items).toHaveLength(2);
    await mine.delete("/api/v1/cart/items/variant-f-pendant-silver");
    expect((await theirs.delete(cartUrl)).status()).toBe(204);
    expect((await (await theirs.get("/api/v1/cart")).json()).data.items).toEqual([]);
    const price = original.priceMinor + 101;
    expect((await editor.patch("/api/v1/admin/variants/" + variantId, { data: { priceMinor: price } })).status()).toBe(200);
    expect((await (await mine.get("/api/v1/cart")).json()).data.subtotalMinor).toBe(price * 2);
    const alt = await db.productVariant.findFirstOrThrow({ where: { productId: "b-lipstick" } });
    await db.productVariant.update({ where: { id: alt.id }, data: { currency: "EUR" } });
    try { expect((await mine.put("/api/v1/cart/items/" + alt.id, { data: { quantity: 1 } })).status()).toBe(409); }
    finally { await db.productVariant.update({ where: { id: alt.id }, data: { currency: alt.currency } }); }

    const wish = "/api/v1/wishlist/f-pendant";
    expect((await mine.put(wish)).status()).toBe(200);
    expect((await mine.put(wish)).status()).toBe(200);
    expect((await (await mine.get("/api/v1/wishlist")).json()).data).toHaveLength(1);
    expect((await (await theirs.get("/api/v1/wishlist")).json()).data).toEqual([]);
    expect((await mine.delete(wish)).status()).toBe(204);
    const entry = { name: "Mixed outfit", kind: "FASHION", items: [{ variantId }] };
    expect((await mine.post("/api/v1/looks", { data: { ...entry, userId: other.id } })).status()).toBe(422);
    expect((await mine.post("/api/v1/looks", { data: { ...entry, items: [{ variantId, configuration: { shadeId: "fake-shade" } }] } })).status()).toBe(422);
    expect((await mine.post("/api/v1/looks", { data: { ...entry, items: [{ variantId, configuration: { selfie: "do not store" } }] } })).status()).toBe(422);
    const look = await mine.post("/api/v1/looks", { data: entry });
    expect(look.status()).toBe(201);
    const lookUrl = "/api/v1/looks/" + (await look.json()).data.id;
    expect((await theirs.get(lookUrl)).status()).toBe(404);
    expect((await theirs.patch(lookUrl, { data: { name: "Wrong owner" } })).status()).toBe(404);
    expect((await theirs.delete(lookUrl)).status()).toBe(404);
    expect((await mine.patch(lookUrl, { data: { name: "Updated outfit" } })).status()).toBe(200);
    expect((await mine.delete(lookUrl)).status()).toBe(204);

    const beauty = { name: "Cross-set beauty edit", kind: "BEAUTY", items: [
      { variantId: "variant-b-espresso-satin-shadow-default", configuration: { shadeId: "espresso-matte" } },
      { variantId: "variant-b-cool-sculpt-duo-default", configuration: {
        shadeId: "deep-taupe", contourSketch: { blend: 85, strokes: [{ size: 7, points: [[410, 300], [510, 290]] }] },
      } },
    ] };
    const savedBeauty = await mine.post("/api/v1/looks", { data: beauty });
    expect(savedBeauty.status()).toBe(201);
    const beautyUrl = "/api/v1/looks/" + (await savedBeauty.json()).data.id;
    const stored = (await (await mine.get(beautyUrl)).json()).data;
    expect(stored.items.map((item: { configuration: unknown }) => item.configuration)).toEqual(beauty.items.map(({ configuration }) => configuration));
    expect((await mine.patch(beautyUrl, { data: { items: [{ ...beauty.items[0], configuration: { shadeId: "deep-taupe" } }] } })).status()).toBe(422);
    expect((await mine.patch(beautyUrl, { data: { items: [{ ...beauty.items[0], configuration: { contourPlacement: { nose: 50 } } }] } })).status()).toBe(422);
    expect((await mine.patch(beautyUrl, { data: { items: [{ ...beauty.items[0], configuration: beauty.items[1].configuration }] } })).status()).toBe(422);
    expect((await mine.patch(beautyUrl, { data: { items: [{ ...beauty.items[1], configuration: {
      contourSketch: { blend: 85, strokes: [{ size: 7, points: [[1001, 300]] }] },
    } }] } })).status()).toBe(422);
    expect((await mine.delete(beautyUrl)).status()).toBe(204);

    const product = { slug: draftId, name: "Local test draft", sku: draftId, category: "FASHION" };
    expect((await editor.post("/api/v1/admin/products", { data: product })).status()).toBe(201);
    expect((await editor.post("/api/v1/admin/products", { data: { ...product, slug: draftId + "-duplicate" } })).status()).toBe(409);
    expect((await mine.get("/api/v1/products/" + draftId)).status()).toBe(404);
    expect((await editor.patch("/api/v1/admin/scenes/monochrome-street", { data: {
      hotspots: [{ productId: "f-pendant", rect: [720, 0, 100, 100] }],
    } })).status()).toBe(422);
    expect((await editor.patch("/api/v1/admin/products/" + draftId, { data: JSON.stringify({ description: "x".repeat(70000) }), headers: { "Content-Type": "application/json" } })).status()).toBe(413);
    const audit = (await (await editor.get("/api/v1/admin/audit?limit=2")).json());
    expect(audit.data.some((event: { actorId: string; action: string }) => event.actorId === admin.id && event.action === "PRODUCT_CREATED")).toBeTruthy();
    expect((await (await editor.get("/api/v1/admin/audit?limit=2&cursor=" + audit.meta.nextCursor)).json()).data[0].action).toBe("INVENTORY_UPDATED");
  } finally {
    await db.productVariant.update({ where: { id: variantId }, data: { priceMinor: original.priceMinor } });
    await db.inventory.update({ where: { variantId }, data: { onHand: original.inventory!.onHand } });
    await db.product.deleteMany({ where: { id: draftId } });
    await db.auditLog.deleteMany({ where: { actorId: admin.id } });
    await db.user.deleteMany({ where: { id: { in: actors.map(({ id }) => id) } } });
    await Promise.all(clients.map((client) => client.dispose()));
  }
});

test("shop sign-in, guest copy, bag feedback and demo checkout work in the browser", async ({ page }, info) => {
  const buyer = await db.user.findUniqueOrThrow({ where: { email: process.env.FAIRY_DEV_EMAIL } });
  await db.cart.deleteMany({ where: { userId: buyer.id } });
  await db.wishlistItem.deleteMany({ where: { userId: buyer.id } });
  await db.savedLook.deleteMany({ where: { userId: buyer.id } });
  await page.goto("/studio/fashion");
  await page.getByRole("button", { name: "Save outfit" }).click();
  await page.goto("/shop/f-pendant");
  await page.getByRole("button", { name: "Add to demo bag" }).click();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("link", { name: "Open FAIRY account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(process.env.FAIRY_DEV_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.FAIRY_DEV_AUTH_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account bag", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy outfit" }).click();
  await expect(page.getByText("Outfit copied to your account.")).toBeVisible();
  await page.getByRole("button", { name: "Load in studio" }).click();
  await expect(page).toHaveURL(/\/studio\/fashion$/);
  await expect(page.getByRole("button", { name: "Remove Silver Cross Pendant" })).toBeVisible();
  await page.goto("/account");
  await page.getByRole("button", { name: "Copy to bag" }).click();
  await expect(page.getByText("Copied to your account bag.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Shopping bag, 1 item" })).toBeVisible();
  await page.goto("/shop/b-lipstick?shade=berry");
  await expect(page.getByRole("radio", { name: "Mulberry" })).toBeChecked();
  const peach = page.getByRole("radio", { name: "Peach Nude" });
  await peach.click();
  await expect(peach).toBeChecked();
  await expect(page.getByRole("link", { name: "Try this shade" })).toHaveAttribute("href", /shade=peach$/);
  await page.getByRole("link", { name: "Try this shade" }).click();
  const swatches = page.getByRole("group", { name: "Lipstick shades" });
  await expect(swatches.getByRole("button", { name: "Peach Nude" })).toHaveAttribute("aria-pressed", "true");
  await swatches.getByRole("button", { name: "Dusty Rose" }).click();
  await page.getByRole("link", { name: "View product", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Dusty Rose" })).toBeChecked();
  await page.goto("/shop/f-pendant");
  await page.getByRole("button", { name: "Add to demo bag" }).click();
  await expect(page.getByText("Added to account bag · Qty 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save item", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 520 });
  await page.getByRole("radio", { name: "Silver finish" }).check();
  await page.evaluate(() => window.scrollTo(0, 0));
  const quickAdd = page.getByRole("group", { name: "Quick add to bag" });
  await expect(quickAdd).toContainText("Silver finish · $48.00");
  await quickAdd.getByRole("button", { name: "Add to bag" }).click();
  await expect(quickAdd).toContainText("Added to account bag · Qty 1");
  await page.getByRole("button", { name: "Shopping bag, 3 items" }).click();
  const bagDrawer = page.getByRole("dialog", { name: "Your demo bag" });
  await expect(bagDrawer.getByText("Silver finish · Qty 1")).toBeVisible();
  await expect(bagDrawer.getByText("Subtotal")).toHaveText("Subtotal $144.00");
  await expect(bagDrawer.getByRole("link", { name: "Review demo checkout" })).toBeInViewport({ ratio: 1 });
  await bagDrawer.getByRole("link", { name: "Manage account bag" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.setViewportSize({ width: 1672, height: 941 });
  await expect(page.getByRole("region", { name: "Saved items" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Saved looks" }).getByText("Outfit 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Shopping bag, 3 items" })).toBeVisible();
  const accountBag = page.getByRole("region", { name: "Account bag" });
  const silver = accountBag.getByRole("listitem").filter({ has: page.getByText("Silver finish · Qty 1", { exact: true }) });
  await silver.getByRole("combobox", { name: "Change option for Silver Cross Pendant" }).selectOption("variant-f-pendant-default");
  await expect(accountBag.getByText("Black inlay · Qty 3")).toBeVisible();
  await accountBag.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(accountBag.getByRole("link", { name: "Continue shopping" })).toBeVisible();
  await accountBag.getByRole("button", { name: "Undo removal" }).click();
  await expect(accountBag.getByText("Black inlay · Qty 3")).toBeVisible();
  await page.screenshot({ path: info.outputPath("fairy-account.png"), fullPage: true });
  await page.getByRole("region", { name: "Account bag" }).getByRole("link", { name: "Review demo checkout" }).click();
  await expect(page.getByRole("heading", { name: "Demo checkout" })).toBeVisible();
  await expect(page.getByText("Demo — no payment will be taken.")).toBeVisible();
  await expect(page.getByText("Qty 3")).toBeVisible();
  await expect(page.getByRole("button", { name: /pay|place order/i })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("fairy-demo-checkout-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Manage your account bag" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});

