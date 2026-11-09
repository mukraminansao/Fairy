import { expect, test, type Locator, type Page } from "@playwright/test";
import catalog from "../data/catalog.json";
import sceneData from "../data/scenes.json";

async function captureFigure(figure: Locator, path: string) {
  await figure.locator("image").evaluateAll((layers) => Promise.all(layers.map(async (layer) => {
    const image = new Image();
    image.src = layer.getAttribute("href")!;
    await image.decode();
  })));
  return figure.screenshot({ path, animations: "disabled" });
}

async function openSets(page: Page, category: string) {
  await page.getByRole("navigation", { name: category + " sets" }).getByRole("button", { name: "Browse sets" }).click();
  return page.getByRole("dialog", { name: "Browse " + category.toLowerCase() + " sets" });
}

async function chooseSet(page: Page, category: string, title: string) {
  const dialog = await openSets(page, category);
  await dialog.getByRole("link", { name: new RegExp(title) }).click();
  await expect(dialog).not.toBeVisible();
}

async function productPoint(page: Page, set: string, x: number, y: number) {
  const image = page.getByRole("img", { name: set + " shoppable flat-lay" });
  await expect(image).toBeVisible();
  const bounds = await image.boundingBox();
  if (!bounds) throw new Error(set + " photo could not be measured.");
  const size = await image.evaluate(async (img: HTMLImageElement) => {
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  return { x: bounds.x + bounds.width * x / size[0], y: bounds.y + bounds.height * y / size[1] };
}

test("mixes fashion sets in the same illustrated front and back fitting room", async ({ page }, testInfo) => {
  await page.goto("/looks/monochrome-street");
  const fashion = await openSets(page, "Fashion");
  await expect(fashion.getByRole("link")).toHaveCount(3);
  await fashion.getByRole("link", { name: /Rose Occasion/ }).click();
  await expect(page.getByRole("heading", { name: "Rose Occasion", level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: "Rose Satin Maxi Dress studio close-up" })).toBeVisible();
  await page.getByRole("button", { name: "Add to look", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Rose Satin Maxi Dress added");
  const outfit = page.getByRole("img", { name: /^2D mannequin/ });
  await expect(outfit).toHaveAccessibleName(/Rose satin dress/);
  await expect(outfit).not.toHaveAccessibleName(/Cargo pants|Jacket|Tee|Sneakers|Pendant/);
  await expect(outfit.locator('[data-worn-piece="f-rose-dress"][data-mannequin-pose="relaxed"]')).toBeVisible();
  await expect(outfit.locator('image[href$="dress-elegant-front.webp"]').first()).toBeVisible();
  await page.getByRole("button", { name: "Select Champagne Satin Slingbacks", exact: true }).press("Enter");
  await page.getByRole("button", { name: "Add to look", exact: true }).click();
  await expect(outfit.locator('[data-worn-piece="f-rose-heels"]')).toBeVisible();

  await chooseSet(page, "Fashion", "Sage Layers");
  await expect(page.getByRole("heading", { name: "Sage Layers", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Add to look", exact: true }).click();
  await expect(outfit).toHaveAccessibleName(/Rose satin dress.*Champagne Satin Slingbacks.*Sage chiffon hijab/);
  await expect(outfit.locator('[data-worn-piece="f-sage-hijab"]')).toBeVisible();
  await page.reload();
  await expect(outfit).toHaveAccessibleName(/Rose satin dress.*Sage chiffon hijab/);
  await page.getByRole("link", { name: "Open virtual fitting room" }).click();
  await expect(page).toHaveURL(/studio\/fashion\?set=sage-layers&item=/);
  await expect(outfit).toHaveAccessibleName(/Rose satin dress.*Sage chiffon hijab/);
  const front = await captureFigure(outfit, testInfo.outputPath("mixed-front.png"));
  await page.getByRole("button", { name: "Back view" }).click();
  await expect(outfit).toHaveAccessibleName(/back view.*Rose satin dress.*Sage chiffon hijab/);
  await expect(outfit.locator('image[href$="hijab-back.webp"]')).toBeVisible();
  await expect(outfit.locator('image[href$="dress-elegant-back.webp"]').first()).toBeVisible();
  const back = await captureFigure(outfit, testInfo.outputPath("mixed-back.png"));
  expect(back.equals(front)).toBe(false);

  await page.getByRole("button", { name: "Front view" }).click();
  await page.getByText("Add pieces", { exact: true }).click();
  await page.getByRole("button", { name: "Add Taupe Pleated Maxi Skirt", exact: true }).click();
  await page.getByRole("button", { name: "Add Essential White Tee", exact: true }).click();
  await expect(outfit).toHaveAccessibleName(/Sage chiffon hijab.*Taupe pleated skirt.*Tee/);
  await expect(outfit.locator('[data-worn-piece="f-rose-dress"]')).toHaveCount(0);
  await expect(outfit.locator('[data-worn-piece="f-taupe-skirt"][data-mannequin-pose="relaxed"]')).toBeVisible();
  await expect(outfit.locator('image[href$="skirt-tee-front.webp"]').first()).toBeVisible();
  await captureFigure(outfit, testInfo.outputPath("mixed-skirt.png"));
  await page.getByRole("button", { name: "Add Monochrome Track Jacket", exact: true }).click();
  await expect(outfit.locator('image[href$="skirt-jacket-front.webp"]').first()).toBeVisible();
  await captureFigure(outfit, testInfo.outputPath("mixed-jacket.png"));
});

test("mixes eye, cheek, and lip products across beauty sets and carries the preview to the studio", async ({ page }, testInfo) => {
  await page.goto("/looks/soft-rose-edit");
  const beauty = await openSets(page, "Beauty");
  await expect(beauty.getByRole("link")).toHaveCount(6);
  await beauty.getByRole("link", { name: /Warm Bronze/ }).click();
  await expect(page.getByRole("heading", { name: "Warm Bronze", level: 1 })).toBeVisible();
  const add = page.getByRole("button", { name: "Add to look", exact: true });
  await add.click();
  await expect(page.locator('[data-eye-pigment] stop').first()).toHaveAttribute("stop-color", "#95592d");

  const blush = await productPoint(page, "Warm Bronze", 531, 246);
  await page.mouse.click(blush.x, blush.y);
  await add.click();
  await expect(page.getByRole("status")).toContainText("Replaced Rose Blush");
  await chooseSet(page, "Beauty", "Berry Muse");
  await expect(page.getByRole("heading", { name: "Berry Muse", level: 1 })).toBeVisible();
  await add.click();
  await expect(page.getByRole("status")).toContainText("Replaced Satin Lipstick");

  const preview = page.getByRole("slider", { name: /^Compare before and after/ }).locator("..");
  await expect(preview.locator('[data-eye-pigment] stop').first()).toHaveAttribute("stop-color", "#95592d");
  await expect(preview.locator('[data-effect="lips"]')).toHaveAttribute("fill", "#7d2948");
  await expect(preview.locator('stop[stop-color="#d16b39"]').first()).toBeAttached();
  const list = page.getByRole("list", { name: "Products in your beauty edit" });
  await expect(list).toContainText("Bronze Veil Eyeshadow");
  await expect(list).toContainText("Apricot Cream Blush");
  await expect(list).toContainText("Berry Velvet Lipstick");

  await page.screenshot({ path: testInfo.outputPath("berry-muse.png"), animations: "disabled" });
  await page.getByRole("link", { name: "Open virtual makeup try-on" }).click();
  await expect(page).toHaveURL(/studio\/beauty/);
  await page.reload();
  await expect(list).toContainText("Bronze Veil Eyeshadow");
  await expect(list).toContainText("Apricot Cream Blush");
  await expect(list).toContainText("Berry Velvet Lipstick");
  await expect(preview.locator('[data-eye-pigment] stop').first()).toHaveAttribute("stop-color", "#95592d");
  await expect(preview.locator('[data-effect="lips"]')).toHaveAttribute("fill", "#7d2948");
  await expect(preview.locator('stop[stop-color="#d16b39"]').first()).toBeAttached();
  await captureFigure(preview.locator("svg"), testInfo.outputPath("mixed-makeup.png"));
  await list.getByRole("button", { name: "Customize Berry Velvet Lipstick" }).click();
  await page.getByRole("link", { name: "View set", exact: true }).click();
  await expect(page).toHaveURL(/set=berry-muse&item=b-berry-lip$/);
  const plum = await productPoint(page, "Berry Muse", 516, 252);
  await page.mouse.click(plum.x, plum.y);
  await add.click();
  await expect(preview.locator('[data-eye-pigment] stop').first()).toHaveAttribute("stop-color", "#765075");
  await expect(preview.locator('[data-effect="lips"]')).toHaveAttribute("fill", "#7d2948");
  await expect(list).not.toContainText("Bronze Veil Eyeshadow");
});

const scenes = [
  { route: "/looks/monochrome-street", category: "Fashion", set: "Rose Occasion", points: [
    ["f-rose-dress", "Rose Satin Maxi Dress", 260, 520],
    ["f-pearl-necklace", "Pearl Solitaire Necklace", 663, 280],
    ["f-pearl-earrings", "Freshwater Pearl Drop Earrings", 910, 219],
    ["f-gold-watch", "Petite Gold Bracelet Watch", 580, 442],
    ["f-pearl-ring", "Pearl Cocktail Ring", 753, 428],
    ["f-tennis-bracelet", "Gold Crystal Tennis Bracelet", 970, 404],
    ["f-champagne-stole", "Champagne Organza Stole", 611, 724],
    ["f-rose-clutch", "Rose Satin Envelope Clutch", 920, 720],
    ["f-pearl-comb", "Pearl Hair Comb", 572, 918],
    ["f-rose-glasses", "Rose Oval Sunglasses", 756, 940],
    ["f-crystal-brooch", "Crystal Blossom Brooch", 1030, 941],
    ["f-rose-heels", "Champagne Satin Slingbacks", 813, 1241],
  ] },
  { route: "/looks/monochrome-street", category: "Fashion", set: "Sage Layers", points: [
    ["f-sage-hijab", "Sage Chiffon Hijab", 274, 244],
    ["f-taupe-skirt", "Taupe Pleated Maxi Skirt", 267, 900],
    ["f-ivory-blouse", "Ivory Crepe Blouse", 746, 270],
    ["f-ivory-handbag", "Ivory Top-Handle Bag", 625, 632],
    ["f-taupe-flats", "Taupe Bow Ballet Flats", 879, 682],
    ["f-emerald-watch", "Emerald Dial Silver Watch", 574, 853],
    ["f-knot-ring", "Silver Knot Ring", 753, 873],
    ["f-silver-cuff", "Polished Silver Cuff", 942, 882],
    ["f-crescent-necklace", "Silver Crescent Necklace", 616, 1159],
    ["f-olive-glasses", "Olive Square Sunglasses", 846, 1069],
    ["f-hijab-pins", "Sage Magnetic Hijab Pins", 575, 1272],
    ["f-woven-belt", "Beige Woven Belt", 890, 1290],
  ] },
  { route: "/looks/soft-rose-edit", category: "Beauty", set: "Warm Bronze", points: [
    ["b-bronze-shadow", "Bronze Veil Eyeshadow", 210, 252],
    ["b-apricot-blush", "Apricot Cream Blush", 531, 246],
    ["b-golden-tint", "Golden Veil Skin Tint", 868, 252],
    ["b-caramel-lip", "Caramel Satin Lipstick", 203, 558],
    ["b-cinnamon-liner", "Cinnamon Lip Liner", 531, 550],
    ["b-gold-illuminator", "Golden Hour Liquid Illuminator", 869, 542],
    ["b-amber-brow", "Amber Brow Gel", 174, 898],
    ["b-honey-balm", "Honey Glaze Lip Balm", 529, 917],
    ["b-angled-brush", "Bronze Angled Shadow Brush", 869, 900],
    ["b-cinnamon-bronzer", "Cinnamon Pressed Bronzer", 195, 1291],
    ["b-ivory-sponge", "Ivory Blending Sponge", 543, 1284],
    ["b-amber-mist", "Amber Dew Setting Mist", 864, 1280],
  ] },
  { route: "/looks/soft-rose-edit", category: "Beauty", set: "Berry Muse", points: [
    ["b-berry-lip", "Berry Velvet Lipstick", 210, 210],
    ["b-plum-shadow", "Plum Smoke Eyeshadow", 516, 252],
    ["b-plum-mascara", "Plum Lash Mascara", 824, 239],
    ["b-berry-blush", "Cool Berry Powder Blush", 191, 590],
    ["b-mulberry-oil", "Mulberry Lip Oil", 531, 611],
    ["b-burgundy-pencil", "Burgundy Eye Pencil", 869, 554],
    ["b-lavender-concealer", "Lavender Brightening Concealer", 199, 888],
    ["b-berry-scrub", "Berry Sugar Lip Scrub", 533, 900],
    ["b-lavender-powder", "Lavender Loose Setting Powder", 879, 898],
    ["b-lash-curler", "Midnight Lash Curler", 193, 1196],
    ["b-fan-brush", "Raspberry Fan Brush", 525, 1123],
    ["b-lilac-highlight", "Lilac Pearl Highlighter", 825, 1287],
  ] },
] as const;

test("every fashion and beauty set has twelve unique products", () => {
  const inventory = sceneData.scenes.flatMap((scene) => scene.hotspots.map(({ productId }) => productId));
  expect(new Set(inventory).size).toBe(inventory.length);
  for (const scene of sceneData.scenes) {
    expect(scene.hotspots.length, scene.title).toBe(12);
  }
});

test("head and wrist accessories are worn and can be inspected from the supported views", async ({ page }, testInfo) => {
  await page.goto("/studio/fashion");
  await page.getByText("Add pieces", { exact: true }).click();
  const accessories = ["f-headphones", "f-sunglasses", "f-watch", "f-bracelet", "f-rings"];
  const outfit = page.getByRole("img", { name: /^2D mannequin/ });
  const worn = (id: string) => outfit.locator('[data-worn-piece="' + id + '"]');
  for (const id of accessories) {
    const product = catalog.products.find((item) => item.id === id)!;
    await page.getByRole("button", { name: "Add " + product.name, exact: true }).click();
    await expect(worn(id)).toBeVisible();
  }
  await expect(outfit.locator('[data-mannequin-pose="hands-visible"]')).toBeVisible();
  await captureFigure(outfit, testInfo.outputPath("street-full.png"));
  await page.getByRole("button", { name: "Head & neck" }).click();
  await expect(outfit).toHaveAttribute("viewBox", "317 0 306 480");
  await expect(worn("f-pendant")).toBeVisible();
  await expect(worn("f-pendant").locator('image[href$="silver_cross_pendant_macro.png"]').first()).toBeVisible();
  await expect(worn("f-headphones").locator('image[href$="headphones-front.webp"]')).toBeVisible();
  await expect(worn("f-sunglasses").locator('image[href$="sunglasses-front.webp"]')).toBeVisible();
  await captureFigure(outfit, testInfo.outputPath("street-head.png"));
  await page.getByRole("button", { name: "Hands & wrists" }).click();
  await expect(outfit).toHaveAttribute("viewBox", "140 746 660 370");
  for (const id of ["f-watch", "f-bracelet", "f-rings"]) {
    await expect(worn(id).locator('image[href$="' + id + '.webp"]').first()).toBeVisible();
  }
  await captureFigure(outfit, testInfo.outputPath("street-hands.png"));
  await page.getByRole("button", { name: "Back view" }).click();
  await expect(worn("f-sunglasses")).toHaveCount(0);
  for (const id of ["f-headphones", "f-watch", "f-bracelet", "f-rings"]) {
    await expect(worn(id)).toBeVisible();
  }
  await expect(worn("f-headphones").locator('image[href$="headphones-back.webp"]')).toBeVisible();
  await captureFigure(outfit, testInfo.outputPath("street-hands-back.png"));
  await page.getByRole("button", { name: "Head & neck" }).click();
  await captureFigure(outfit, testInfo.outputPath("street-head-back.png"));
});

for (const scene of scenes) {
  test(scene.set + " products are individually clickable in one photo", async ({ page }, testInfo) => {
    await page.goto(scene.route);
    await chooseSet(page, scene.category, scene.set);
    await expect(page.getByRole("img", { name: scene.set + " shoppable flat-lay" })).toHaveCount(1);
    if (scene.category === "Fashion") {
      await page.getByRole("button", { name: "Wear this set" }).click();
      await expect(page.getByRole("list", { name: "Pieces in your look" }).getByRole("listitem")).toHaveCount(12);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: testInfo.outputPath("set-overview.png"), animations: "disabled" });
    }
    const closeUps = new Set<string>();
    for (const [id, product, x, y] of scene.points) {
      const point = await productPoint(page, scene.set, x, y);
      await page.mouse.click(point.x, point.y);
      await expect(page.getByRole("heading", { name: product, exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Select " + product, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("[data-connector-for]")).toHaveAttribute("data-connector-for", id);
      const closeUp = page.getByRole("img", { name: product + (scene.category === "Fashion" ? " studio close-up" : " close-up") });
      await expect(closeUp).toBeVisible();
      const source = await closeUp.evaluate(async (img: HTMLImageElement) => {
        await img.decode();
        return img.currentSrc;
      });
      closeUps.add(source);
    }
    expect(closeUps.size).toBe(scene.points.length);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath("flat-lay.png"), animations: "disabled" });
    if (scene.category === "Fashion") {
      await page.getByRole("link", { name: "Open virtual fitting room" }).click();
      await expect(page.getByRole("heading", { name: "Your virtual fitting room" })).toBeVisible();
      const figure = page.getByRole("img", { name: /^2D mannequin/ });
      await captureFigure(figure, testInfo.outputPath("set-on-mannequin.png"));
      await page.getByRole("button", { name: "Head & neck" }).click();
      await captureFigure(figure, testInfo.outputPath("set-head.png"));
      await page.getByRole("button", { name: "Hands & wrists" }).click();
      await captureFigure(figure, testInfo.outputPath("set-hands.png"));
      await page.getByRole("button", { name: "Back view" }).click();
      await captureFigure(figure, testInfo.outputPath("set-hands-back.png"));
      await page.getByRole("button", { name: "Full look" }).click();
      await captureFigure(figure, testInfo.outputPath("set-back.png"));
    }
  });
}

test("the set browser filters and photo hotspots fit a phone", async ({ browser, baseURL }, testInfo) => {
  const page = await browser.newPage({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  try {
    for (const [scene, selected] of [[scenes[1], scenes[1].points[1]], [scenes[2], scenes[2].points[0]]] as const) {
      await page.goto(scene.route);
      const dialog = await openSets(page, scene.category);
      const search = dialog.getByRole("searchbox");
      await search.fill("not a set");
      await expect(dialog.getByRole("status")).toContainText("No sets match");
      await search.fill(scene.set);
      await expect(dialog.getByRole("link")).toHaveCount(1);
      if (scene.category === "Fashion") await page.screenshot({ path: testInfo.outputPath("set-browser-mobile.png") });
      await dialog.getByRole("link", { name: new RegExp(scene.set) }).click();
      const [, product, x, y] = selected;
      const point = await productPoint(page, scene.set, x, y);
      await page.touchscreen.tap(point.x, point.y);
      const heading = page.getByRole("heading", { name: product, exact: true });
      await expect(heading).toBeFocused();
      await expect(heading).toBeInViewport();
      await expect(page.getByRole("button", { name: "Add to look", exact: true })).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
      await expect(page.getByRole("button", { name: "Browse sets" })).toBeInViewport();
    }
  } finally {
    await page.close();
  }
});
