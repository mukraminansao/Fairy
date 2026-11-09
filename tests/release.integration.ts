import { expect, test } from "@playwright/test";
import catalog from "../data/catalog.json";
import sceneData from "../data/scenes.json";

test("production mode serves the seeded catalog and disables private development features", async ({ request }) => {
  const home = await request.get("/");
  expect(home.ok()).toBeTruthy();
  expect(home.headers()["x-robots-tag"]).toContain("noindex");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");

  const products = await request.get("/api/v1/products?limit=1");
  expect(products.ok()).toBeTruthy();
  expect((await products.json()).meta.count).toBe(catalog.products.length);
  const beauty = await request.get("/api/v1/scenes?kind=beauty");
  expect(beauty.ok()).toBeTruthy();
  expect((await beauty.json()).data).toHaveLength(sceneData.scenes.filter(({ kind }) => kind === "beauty").length);
  const scene = (await (await request.get("/api/v1/scenes/midnight-pearl")).json()).data;
  expect(scene.hotspots).toHaveLength(12);
  expect((await request.get(scene.image)).ok()).toBeTruthy();
  const product = (await (await request.get("/api/v1/products/b-plum-silk-lip")).json()).data;
  expect(product.images[0].path).not.toBe(scene.image);
  expect((await request.get(product.images[0].path)).ok()).toBeTruthy();

  expect((await request.get("/api/auth/providers")).status()).toBe(503);
  expect((await request.get("/api/v1/admin/products")).status()).toBe(401);
  expect((await request.get("/api/v1/cart")).status()).toBe(401);
  expect((await request.get("/camera-runtime/tracker.js")).status()).toBe(404);
  expect((await request.post("/api/v1/checkout/charge", { data: {} })).status()).toBe(404);
});

test("guest can select a product and review the demo bag in the production build", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/shop/f-pendant");
  await expect(page.getByRole("heading", { name: "Silver Cross Pendant", level: 1 })).toBeVisible();
  await page.getByRole("radio", { name: "Silver finish" }).check();
  await page.getByRole("button", { name: "Add to demo bag" }).click();
  await page.getByRole("button", { name: "Shopping bag, 1 item" }).click();
  await page.getByRole("link", { name: "Review demo checkout" }).click();
  await expect(page.getByRole("heading", { name: "Demo checkout", level: 1 })).toBeVisible();
  await expect(page.getByText("Demo — no payment will be taken.")).toBeVisible();
  await expect(page.getByText("Silver finish · Qty 1")).toBeVisible();
  await expect(page.getByText("$48.00", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("button", { name: /pay now|place order/i })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Silver finish · Qty 1")).toBeVisible();
  await page.screenshot({ path: info.outputPath("release-demo-checkout.png"), animations: "disabled" });
  expect(errors).toEqual([]);
});

test("mobile studio remains usable and exposes no webcam or local sign-in", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/looks/one-piece-two-ways?style=evening");
  await expect(page.getByRole("button", { name: "Evening", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Try this look" }).click();
  await expect(page.getByRole("list", { name: "Pieces in your look" }).getByText("Champagne Satin Slingbacks")).toBeVisible();
  await page.goto("/studio/beauty?item=b-eyeshadow");
  await expect(page.getByRole("button", { name: "Use camera" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Upload selfie" })).toBeDisabled();
  await expect(page.getByRole("slider", { name: "Compare before and after on the sample model" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: info.outputPath("release-mobile-studio.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Full-screen preview" }).click();
  const preview = page.getByRole("dialog", { name: "Makeup preview" });
  await expect(preview.getByRole("combobox", { name: "Shade" })).toBeVisible();
  await preview.getByRole("button", { name: "Close preview" }).click();
  await page.goto("/account");
  await expect(page.getByText("Account sign-in is unavailable in this preview.")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
});

