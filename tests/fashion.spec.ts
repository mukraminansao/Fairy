import { expect, test, type Locator, type Page } from "@playwright/test";

const route = "/looks/monochrome-street";
const products = [
  ["f-jacket", "Monochrome Track Jacket", 100, 370],
  ["f-tee", "Essential White Tee", 230, 260],
  ["f-pants", "Oversized Cargo Pants", 149, 760],
  ["f-shoes", "Monochrome High-Top Sneakers", 145, 1115],
  ["f-headphones", "On-Ear Headphones", 527, 294],
  ["f-sunglasses", "Black Sport Sunglasses", 540, 420],
  ["f-bracelet", "Silver Chain Bracelet", 501, 522],
  ["f-rings", "Mixed Signet Rings", 470, 607],
  ["f-pendant", "Silver Cross Pendant", 640, 637],
  ["f-watch", "Black Digital Watch", 479, 699],
  ["f-lighter", "Black Metal Lighter", 578, 721],
  ["f-bag", "Black Sling Bag", 496, 947],
] as const;

async function pointOnPhoto(page: Page, x: number, y: number) {
  const image = page.getByRole("img", { name: /Original Monochrome Street flat-lay/ });
  await expect(image).toBeVisible();
  const box = await image.boundingBox();
  if (!box) throw new Error("Original photo could not be measured.");
  return { x: box.x + x / 736 * box.width, y: box.y + y / 1308 * box.height };
}

test("desktop fashion renders at the reference viewport", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Make the look yours.");
  const details = page.getByRole("tabpanel", { name: "Item details" });
  await expect(details.getByRole("heading", { name: "Silver Cross Pendant" })).toBeVisible();
  await expect(details.getByText("$48", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Items in the flat-lay" }).getByRole("button")).toHaveCount(12);
  await expect(page.getByRole("heading", { name: "Your look so far" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.locator("main img:visible").evaluateAll((images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
  const image = await page.getByRole("img", { name: /Original Monochrome Street flat-lay/ }).boundingBox();
  expect(image!.width / image!.height).toBeCloseTo(736 / 1308, 2);
  expect(image!.width).toBeGreaterThan(450);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), animations: "disabled" });
});

for (const [id, name, x, y] of products) {
  test("selects " + name + " directly in the photograph", async ({ page }, testInfo) => {
    await page.goto(id === "f-pendant" ? route + "?item=f-jacket" : route);
    const connector = page.locator("[data-connector-for]");
    const line = connector.locator("path").first();
    const initialPath = await line.getAttribute("d");
    const point = await pointOnPhoto(page, x, y);
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.click(point.x, point.y);
    const details = page.getByRole("tabpanel", { name: "Item details" });
    await expect(details.getByRole("heading", { name, exact: true })).toBeVisible();
    const image = details.getByRole("button", { name: "Zoom " + name, exact: true }).locator("img");
    await expect(image).toHaveAttribute("src", id === "f-pendant" ? /silver_cross_pendant_macro/ : new RegExp(id + (id === "f-jacket" ? "-marked" : "") + "\.webp"));
    await image.evaluate((element) => (element as HTMLImageElement).decode());
    await expect(page.getByRole("button", { name: "Select " + name, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(new RegExp("item=" + id + "$"));
    await expect(connector).toHaveAttribute("data-connector-for", id);
    await expect(connector).toBeVisible();
    await expect(line).not.toHaveAttribute("d", initialPath!);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    if (id === "f-shoes") {
      await page.mouse.move(0, 0);
      await page.screenshot({ path: testInfo.outputPath("connector.png"), animations: "disabled" });
    }
  });
}

test("supports keyboard selection, history, and accessible photo zoom", async ({ page }) => {
  await page.goto(route);
  await page.getByRole("button", { name: "Select Essential White Tee" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Essential White Tee" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Silver Cross Pendant" })).toBeVisible();
  await expect(page.locator("[data-connector-for]")).toHaveAttribute("data-connector-for", "f-pendant");

  const zoom = page.getByRole("button", { name: "Zoom Silver Cross Pendant" });
  await zoom.focus();
  await page.keyboard.press("Space");
  const dialog = page.getByRole("dialog", { name: "Silver Cross Pendant" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(zoom).toBeFocused();
  await page.getByRole("button", { name: "View product details" }).click();
  await expect(dialog.getByText(/Demo product · DEMO-F-005/)).toBeVisible();
  await dialog.getByRole("button", { name: "Close product preview" }).click();
  await expect(dialog).not.toBeVisible();
});

test("saves the look and pendant finish across the fitting room and reload", async ({ page }) => {
  await page.goto(route);
  await page.getByRole("button", { name: "Silver finish", exact: true }).click();
  await expect(page.getByText("Silver selected. Photo shows the black inlay.")).toBeVisible();
  await page.getByRole("button", { name: "Add to look" }).click();
  await expect(page.getByRole("status")).toHaveText("Pendant color updated in your look.");
  await page.getByLabel("Choose an item").selectOption("f-bracelet");
  await page.getByRole("button", { name: "Add to look" }).click();
  await expect(page.getByRole("status")).toHaveText("Silver Chain Bracelet added to your look.");
  await page.getByRole("button", { name: "Add to look" }).click();
  await expect(page.getByRole("status")).toHaveText("Silver Chain Bracelet is already in your look.");

  await page.getByRole("tab", { name: "Item details" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Virtual try-on" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "2D outfit preview" })).toBeVisible();
  await expect(page.locator("[data-connector-for]")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("link", { name: "Open virtual fitting room" }).click();
  await expect(page).toHaveURL(/\/studio\/fashion\?item=f-bracelet$/);
  await page.reload();
  await expect(page.getByRole("link", { name: "Silver Chain Bracelet" })).toBeVisible();
  await expect(page.getByText("Silver finish", { exact: true })).toBeVisible();
  await expect(page.getByText("Demo subtotal")).toHaveText("Demo subtotal $363.00");
  await page.getByRole("button", { name: "Remove Silver Chain Bracelet" }).click();
  await expect(page.getByRole("link", { name: "Silver Chain Bracelet" })).toHaveCount(0);
  await expect(page.getByText("Demo subtotal")).toHaveText("Demo subtotal $328.00");
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(route + "\\?item=f-bracelet$"));
});

async function waitForIllustration(figure: Locator) {
  await figure.evaluate(async (element) => {
    await Promise.all([...element.querySelectorAll("image")].map(async (layer) => {
      const path = layer.getAttribute("href");
      if (!path) throw new Error("Missing outfit illustration.");
      const image = new Image();
      image.src = path;
      await image.decode();
    }));
  });
}

test("removing and restoring pieces changes the rendered mannequin", async ({ page }, testInfo) => {
  await page.goto("/studio/fashion");
  const figure = page.getByRole("img", { name: /^2D mannequin/ });
  await waitForIllustration(figure);
  let last = await figure.screenshot({ path: testInfo.outputPath("outfit-complete.png"), animations: "disabled" });
  for (const [name, label, file] of [
    ["Monochrome Track Jacket", "Jacket", "without-jacket"],
    ["Essential White Tee", "Tee", "without-tee"],
    ["Oversized Cargo Pants", "Cargo pants", "without-pants"],
    ["Monochrome High-Top Sneakers", "Sneakers", "without-sneakers"],
    ["Silver Cross Pendant", "Pendant", "base-layer"],
  ]) {
    await page.getByRole("button", { name: "Remove " + name, exact: true }).click();
    await expect(figure).not.toHaveAccessibleName(new RegExp(label));
    await waitForIllustration(figure);
    const current = await figure.screenshot({ path: testInfo.outputPath(file + ".png"), animations: "disabled" });
    expect(current.equals(last), name + " should change the visible outfit").toBe(false);
    last = current;
  }
  await expect(figure).toHaveAccessibleName("2D mannequin in its neutral base layer");
  await page.getByText("Add pieces", { exact: true }).click();
  await page.getByRole("button", { name: "Add Essential White Tee", exact: true }).click();
  await expect(figure).toHaveAccessibleName("2D mannequin wearing Tee");
  await waitForIllustration(figure);
  expect((await figure.screenshot({ animations: "disabled" })).equals(last)).toBe(false);

  await page.getByRole("button", { name: "Add On-Ear Headphones", exact: true }).click();
  await expect(figure.locator('[data-worn-piece="f-headphones"]')).toBeVisible();
  await page.reload();
  await expect(figure).toHaveAccessibleName("2D mannequin wearing Tee, On-Ear Headphones");
});

test("shows a larger illustrated back view and wears the selected sling bag", async ({ page }, testInfo) => {
  await page.goto("/studio/fashion");
  const figure = page.getByRole("img", { name: /^2D mannequin/ });
  const front = page.getByRole("button", { name: "Front view", exact: true });
  const back = page.getByRole("button", { name: "Back view", exact: true });
  const bag = figure.locator('[data-worn-piece="f-bag"]');
  await expect(front).toHaveAttribute("aria-pressed", "true");
  const frame = await figure.boundingBox();
  expect(frame?.height).toBeGreaterThan(600);
  expect(frame!.y + frame!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await waitForIllustration(figure);
  await figure.screenshot({ path: testInfo.outputPath("front.png") });

  await back.click();
  await expect(back).toHaveAttribute("aria-pressed", "true");
  await expect(figure).toHaveAccessibleName(/^2D mannequin back view/);
  await expect(bag).toHaveCount(0);
  await page.getByRole("button", { name: "Try sling bag" }).click();
  await expect(figure).toHaveAccessibleName(/back view.*Black Sling Bag/);
  await expect(bag).toBeVisible();
  await waitForIllustration(figure);
  const artworkHeight = await figure.evaluate(async (element) => {
    const source = element.querySelector('image[href$="rear-dressed.webp"]')?.getAttribute("href");
    if (!source) throw new Error("Missing rear mannequin illustration.");
    const image = new Image();
    image.src = source;
    await image.decode();
    return image.naturalHeight;
  });
  expect(artworkHeight).toBe(1671);
  await figure.screenshot({ path: testInfo.outputPath("back-with-bag.png") });

  await front.click();
  await expect(bag).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Accessories in your look" })).toContainText("Black Sling Bag");
  await back.click();
  await page.getByRole("button", { name: "Remove Monochrome Track Jacket" }).click();
  await expect(figure.locator('image[href$="rear-tee.webp"]')).toBeVisible();
  await expect(bag).toBeVisible();
  await page.getByRole("button", { name: "Remove Black Sling Bag" }).click();
  await expect(bag).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try sling bag" })).toBeVisible();
});

test("saves separate outfits, restores their finish, and adds the selected outfit to the bag", async ({ page }, testInfo) => {
  await page.goto("/studio/fashion");
  const save = page.getByRole("button", { name: "Save outfit", exact: true });
  const bagAction = page.getByRole("button", { name: "Review outfit" });
  const figure = page.getByRole("img", { name: /^2D mannequin/ });
  await expect(save).toBeEnabled();
  await waitForIllustration(figure);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("fitting-desktop.png"), animations: "disabled" });

  await page.getByRole("button", { name: "Use silver finish" }).click();
  await save.click();
  await expect(page.getByRole("status")).toHaveText("Outfit 1 saved in this browser.");
  await save.click();
  await expect(page.getByRole("status")).toHaveText("Outfit 1 is already saved.");
  await page.getByRole("button", { name: "Remove Monochrome Track Jacket" }).click();
  await page.getByRole("button", { name: "Use black inlay" }).click();
  await save.click();
  await expect(page.getByRole("status")).toHaveText("Outfit 2 saved in this browser.");

  await page.reload();
  await expect(page.getByRole("link", { name: "Monochrome Track Jacket" })).toHaveCount(0);
  await page.getByText("Saved outfits (2)", { exact: true }).click();
  await page.getByRole("button", { name: "Load outfit 1", exact: true }).click();
  await expect(page.getByRole("link", { name: "Monochrome Track Jacket" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use silver finish" })).toHaveAttribute("aria-pressed", "true");
  await bagAction.click();
  await page.getByRole("dialog", { name: "Review your look" }).getByRole("button", { name: "Add selected to bag" }).click();
  await expect(page.getByRole("status")).toHaveText("5 pieces added to your demo bag.");
  const confirmation = page.getByRole("list", { name: "Pieces added to your demo bag" });
  await expect(confirmation.getByRole("listitem")).toHaveCount(5);
  await expect(confirmation).toContainText("Silver Cross Pendant · Silver finish");
  await page.getByRole("button", { name: "Use black inlay" }).click();
  await bagAction.click();
  await page.getByRole("dialog", { name: "Review your look" }).getByRole("button", { name: "Add selected to bag" }).click();

  await page.getByRole("button", { name: "Shopping bag, 10 items" }).click();
  const bag = page.getByRole("dialog", { name: "Your demo bag" });
  await expect(bag.getByText("Subtotal")).toHaveText("Subtotal $656.00");
  await expect(bag.getByRole("combobox", { name: "Change option for Silver Cross Pendant" }).first()).toBeVisible();
  await bag.getByRole("button", { name: "Decrease quantity of Silver Cross Pendant, Silver finish" }).click();
  await expect(bag.getByRole("combobox", { name: "Change option for Silver Cross Pendant" })).toHaveValue("f-pendant");
  await expect(bag.getByText("Subtotal")).toHaveText("Subtotal $608.00");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Remove saved outfit 2", exact: true }).click();
  await expect(page.getByText("Saved outfits (1)", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Monochrome Track Jacket" })).toBeVisible();
});

test("the selected pendant renders with the hijab in the front view", async ({ page }, testInfo) => {
  await page.goto("/studio/fashion");
  await page.getByText("Add pieces", { exact: true }).click();
  await page.getByRole("button", { name: "Add Sage Chiffon Hijab", exact: true }).click();
  const model = page.getByRole("img", { name: /^2D mannequin/ });
  const hijab = model.locator('[data-worn-piece="f-sage-hijab"]');
  const pendant = model.locator('[data-worn-piece="f-pendant"]');
  await expect(hijab).toBeVisible();
  await expect(pendant).toBeVisible();
  await page.getByRole("button", { name: "Head & neck" }).click();
  await waitForIllustration(model);
  const withPendant = await model.screenshot({ path: testInfo.outputPath("hijab-pendant.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Remove Silver Cross Pendant" }).click();
  await waitForIllustration(model);
  expect((await model.screenshot({ animations: "disabled" })).equals(withPendant)).toBe(false);
  await page.getByRole("button", { name: "Add Silver Cross Pendant" }).click();
  await page.getByRole("button", { name: "Back view" }).click();
  await expect(pendant).toHaveCount(0);
});

for (const width of [768, 390]) {
  test("fashion photo and controls work at " + width + "px", async ({ browser, baseURL }, testInfo) => {
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: true, reducedMotion: "reduce", baseURL });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await page.locator("main img:visible").evaluateAll((images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath(width + ".png"), fullPage: true, animations: "disabled" });
    await expect(page.locator("[data-connector-for]")).toBeHidden();
    const point = await pointOnPhoto(page, 527, 294);
    const before = await page.evaluate(() => window.scrollY);
    await page.touchscreen.tap(point.x, point.y);
    const heading = page.getByRole("heading", { name: "On-Ear Headphones" });
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    const add = page.getByRole("button", { name: "Add to look" });
    await expect(add).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    await expect(page).toHaveURL(/item=f-headphones$/);
    await add.tap();
    await expect(page.getByRole("status")).toHaveText("On-Ear Headphones added to your look.");
    await page.goto("/studio/fashion");
    const model = page.getByRole("img", { name: /^2D mannequin/ });
    await expect(model).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect((await model.boundingBox())?.height).toBeGreaterThan(450);
    await waitForIllustration(model);
    await page.screenshot({ path: testInfo.outputPath("fitting-" + width + ".png"), fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "Back view" }).tap();
    await expect(model).toHaveAccessibleName(/^2D mannequin back view/);
    await page.close();
  });
}
