import { expect, test, type Page } from "@playwright/test";
import { eyeshadowShades } from "../src/app/makeup-data";

const route = "/looks/soft-rose-edit";
const photoName = /^Soft Rose Edit flat-lay/;
const points = [
  ["b-blush", "Rose Blush", 230, 514],
  ["b-lipstick", "Satin Lipstick", 450, 533],
  ["b-foundation", "Skin Tint Foundation", 707, 477],
  ["b-serum", "Radiance Serum", 955, 515],
  ["b-eyeshadow", "Warm Nude Eyeshadow", 210, 920],
  ["b-mascara", "Defining Mascara", 518, 948],
  ["b-concealer", "Soft Coverage Concealer", 708, 960],
  ["b-fragrance", "No. 03 Eau de Parfum", 932, 933],
  ["b-brush", "Precision Makeup Brush", 450, 1196],
  ["b-rose-liner", "Rosewood Lip Liner", 665, 108],
  ["b-rose-puff", "Rose Velvet Powder Puff", 836, 128],
  ["b-rose-brow", "Rose Gold Clear Brow Gel", 1021, 134],
] as const;

async function photoPoint(page: Page, x: number, y: number) {
  const photo = page.getByRole("img", { name: photoName });
  const bounds = await photo.boundingBox();
  if (!bounds) throw new Error("Soft Rose Edit photo is missing.");
  return { x: bounds.x + bounds.width * x / 1122, y: bounds.y + bounds.height * y / 1402 };
}

async function loadPhotos(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator("main img:visible").evaluateAll((images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
  await page.locator("main svg image").evaluateAll((layers) => Promise.all(layers.map(async (layer) => {
    const image = new Image();
    image.src = layer.getAttribute("href")!;
    await image.decode();
  })));
}

test("makeup scene renders at the approved viewport", async ({ page }, testInfo) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) failures.push(response.url()); });
  await page.goto(route);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create your signature glow.");
  await expect(page.getByRole("link", { name: "Makeup", exact: true }).first()).toHaveAttribute("aria-current", "location");
  await expect(page.getByRole("button", { name: "Soft Mocha" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("tab", { name: "Item details" })).toHaveAttribute("aria-selected", "true");
  await loadPhotos(page);
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1672);
  const photo = await page.getByRole("img", { name: photoName }).locator("..").boundingBox();
  expect(photo?.y).toBeGreaterThan(250);
  expect(photo?.y).toBeLessThan(280);
  expect((photo?.y ?? 0) + (photo?.height ?? 0)).toBeLessThan(941);
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), animations: "disabled" });
});

for (const [id, name, x, y] of points) {
  test("selects " + name + " directly in the makeup photo", async ({ page }, testInfo) => {
    await page.goto(route + (id === "b-lipstick" ? "?item=b-blush" : ""));
    const connector = page.locator("[data-connector-for]");
    const line = connector.locator("path").first();
    const initialPath = await line.getAttribute("d");
    const point = await photoPoint(page, x, y);
    await page.mouse.click(point.x, point.y);
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select " + name, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(new RegExp("item=" + id + "$"));
    await expect(connector).toHaveAttribute("data-connector-for", id);
    await expect(connector).toBeVisible();
    await expect(line).not.toHaveAttribute("d", initialPath!);
    const macro = page.getByRole("button", { name: "Zoom " + name, exact: true });
    const photo = macro.getByRole("img", { name: name + " close-up", exact: id !== "b-lipstick" });
    const filename = id === "b-lipstick" ? "lipstick_soft_mocha_macro.png" : id + ".webp";
    await expect(photo).toHaveAttribute("src", new RegExp(filename.replace(".", "\\.")));
    await photo.evaluate((image: HTMLImageElement) => image.decode());
    if (id === "b-brush") {
      await page.mouse.move(0, 0);
      await loadPhotos(page);
      await page.screenshot({ path: testInfo.outputPath("connector.png"), animations: "disabled" });
    }
  });
}

test("supports keyboard selection, photo zoom, comparison and history", async ({ page }) => {
  await page.goto(route);
  const blush = page.getByRole("button", { name: "Select Rose Blush" });
  await blush.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("heading", { name: "Rose Blush" })).toBeVisible();
  const zoom = page.getByRole("button", { name: "Zoom Rose Blush" });
  await zoom.click();
  const zoomDialog = page.getByRole("dialog", { name: "Rose Blush" });
  await expect(zoomDialog).toBeVisible();
  const zoomPhoto = zoomDialog.getByRole("img", { name: "Rose Blush close-up" });
  await expect(zoomPhoto).toHaveAttribute("src", /b-blush\.webp/);
  await zoomPhoto.evaluate((image: HTMLImageElement) => image.decode());
  await page.keyboard.press("Escape");
  await expect(zoom).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Satin Lipstick" })).toBeVisible();
  await page.getByRole("tab", { name: "Item details" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Virtual try-on" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toBeVisible();
  await expect(page.locator("[data-connector-for]")).toHaveCount(0);
  const comparison = page.getByRole("slider", { name: /^Compare before and after/ });
  await comparison.focus();
  await page.keyboard.press("ArrowRight");
  await expect(comparison).toHaveValue("51");
});

test("saves lipstick shade and edit across reload and studio handoff", async ({ page }) => {
  await page.goto(route);
  await loadPhotos(page);
  const comparison = page.getByRole("slider").locator("..");
  const before = await comparison.screenshot();
  await page.getByRole("button", { name: "Mulberry" }).click();
  await expect(page.getByRole("button", { name: "Mulberry" })).toHaveAttribute("aria-pressed", "true");
  expect((await comparison.screenshot()).equals(before)).toBe(false);
  await page.getByRole("button", { name: "Product details", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Selected shade is Mulberry");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("button", { name: "Mulberry" })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Choose a product").selectOption("b-eyeshadow");
  const add = page.getByRole("button", { name: "Add to look", exact: true });
  await add.click();
  await expect(page.getByRole("status")).toHaveText("Warm Nude Eyeshadow added to your beauty edit.");
  await add.click();
  await expect(page.getByRole("status")).toHaveText("Warm Nude Eyeshadow is already in your beauty edit.");
  await page.getByRole("link", { name: "Open virtual makeup try-on" }).click();
  await expect(page).toHaveURL(/studio\/beauty\?item=b-eyeshadow$/);
  await expect(page.getByRole("button", { name: "Customize Mulberry Lipstick" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review 4 products · $136" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Rose Blush" }).click();
  await expect(page.getByRole("button", { name: "Review 3 products · $102" })).toBeVisible();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page.getByRole("list", { name: "Products in your beauty edit" })).not.toContainText("Blush");
});

test("makeup fits a 1440px viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  await loadPhotos(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);
  await expect(page.getByRole("button", { name: "Add to look", exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("1440.png"), animations: "disabled" });
});

test("all six palette pans visibly change the model and the selected shade persists", async ({ page }, testInfo) => {
  await page.goto(route + "?item=b-eyeshadow");
  await loadPhotos(page);
  const compare = page.getByRole("slider", { name: /^Compare before and after/ });
  await compare.focus();
  await page.keyboard.press("Home");
  const preview = compare.locator("..");
  const shadow = preview.locator('[data-eye-pigment] stop').first();
  const swatches = page.getByRole("group", { name: "Eyeshadow palette shades" });
  await expect(swatches.getByRole("button")).toHaveCount(6);
  const results = new Set<string>();
  for (const shade of eyeshadowShades) {
    const button = swatches.getByRole("button", { name: shade.name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(shadow).toHaveAttribute("stop-color", shade.hex);
    results.add((await preview.screenshot()).toString("base64"));
  }
  expect(results.size).toBe(6);
  await swatches.getByRole("button", { name: "Terracotta" }).click();
  await page.getByRole("button", { name: "Add to look", exact: true }).click();
  await page.getByRole("tab", { name: "Virtual try-on" }).click();
  await expect(swatches.getByRole("button", { name: "Terracotta" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: testInfo.outputPath("palette-try-on.png"), animations: "disabled" });
  await page.getByRole("link", { name: "Open virtual makeup try-on" }).click();
  await expect(shadow).toHaveAttribute("stop-color", "#d0836d");
  await swatches.getByRole("button", { name: "Champagne" }).click();
  await expect(shadow).toHaveAttribute("stop-color", "#f6cdb1");
  await page.reload();
  await expect(swatches.getByRole("button", { name: "Champagne" })).toHaveAttribute("aria-pressed", "true");
  await expect(shadow).toHaveAttribute("stop-color", "#f6cdb1");
});

for (const width of [768, 390]) {
  test("makeup fits " + width + "px and tapping scrolls to the product", async ({ browser, baseURL }, testInfo) => {
    const page = await browser.newPage({ baseURL, viewport: { width, height: 900 }, hasTouch: true, reducedMotion: "reduce" });
    try {
      await page.goto(route);
      await loadPhotos(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await page.screenshot({ path: testInfo.outputPath(width + ".png"), fullPage: true, animations: "disabled" });
      await expect(page.locator("[data-connector-for]")).toBeHidden();
      const point = await photoPoint(page, 230, 514);
      await page.touchscreen.tap(point.x, point.y);
      const heading = page.getByRole("heading", { name: "Rose Blush" });
      await expect(heading).toBeFocused();
      await expect(heading).toBeInViewport();
      await expect(page.getByRole("button", { name: "Add to look", exact: true })).toBeInViewport();
    } finally {
      await page.close();
    }
  });
}

