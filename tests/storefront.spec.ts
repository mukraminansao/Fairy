import { expect, test, type Page } from "@playwright/test";

async function loadPhotos(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator("main img:visible").evaluateAll((images) =>
    Promise.all(images.filter((image) => {
      const { top, bottom } = image.getBoundingClientRect();
      return top < window.innerHeight && bottom > 0;
    })
      .map((image) => (image as HTMLImageElement).decode())));
}

async function expectAlignedActions(page: Page, columns: number) {
  const positions = await page.getByRole("list", { name: "Catalog products" }).getByRole("listitem")
    .evaluateAll((cards, count) => cards.slice(0, count).map((card) =>
      [...card.querySelectorAll("button")].map((button) => button.getBoundingClientRect().top),
    ), columns);
  expect(positions).toHaveLength(columns);
  for (const buttons of positions) {
    expect(buttons).toHaveLength(1);
    for (const [index, top] of buttons.entries()) {
      expect(Math.abs(top - positions[0][index])).toBeLessThanOrEqual(1);
    }
  }
}

test("browses the catalog with shareable price, category and sort filters", async ({ page }, testInfo) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "The FAIRY catalog" })).toBeVisible();
  await loadPhotos(page);
  await page.screenshot({ path: testInfo.outputPath("catalog-desktop.png"), animations: "disabled" });
  await page.getByRole("navigation", { name: "Catalog categories" }).getByRole("link", { name: "Accessories" }).click();
  await expect(page.getByRole("heading", { name: "Accessories", level: 1 })).toBeVisible();
  await page.getByRole("combobox", { name: "Price", exact: true }).selectOption("under-35");
  await page.getByRole("combobox", { name: "Sort by", exact: true }).selectOption("price-asc");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=accessories.*price=under-35.*sort=price-asc/);
  const list = page.getByRole("list", { name: "Catalog products" });
  const prices = await list.getByRole("listitem").locator("p").allTextContents();
  const amounts = prices.map((text) => Number(text.match(/\$(\d+\.\d+)/)?.[1]));
  expect(amounts.length).toBeGreaterThan(2);
  expect(amounts.every((amount) => amount < 35)).toBe(true);
  expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Price", exact: true })).toHaveValue("under-35");
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/shop\?category=accessories$/);
  await expect(page.getByRole("combobox", { name: "Price", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Sort by", exact: true })).toHaveValue("featured");
  await page.getByRole("navigation", { name: "Catalog categories" }).getByRole("link", { name: "All", exact: true }).click();
  const pages = page.getByRole("navigation", { name: "Catalog pages" });
  await pages.getByRole("link", { name: "Page 2" }).click();
  await expect(page).toHaveURL(/page=2$/);
  await expect(pages.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
});

test("aligns catalog actions and confirms additions beside the clicked card", async ({ page }, testInfo) => {
  await page.goto("/shop");
  await loadPhotos(page);
  await expectAlignedActions(page, 4);
  const catalog = page.getByRole("list", { name: "Catalog products" });
  const watch = catalog.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Black Digital Watch", exact: true }) });
  const add = watch.getByRole("button", { name: "Add to demo bag", exact: true });
  await add.scrollIntoViewIfNeeded();
  await add.click();
  const status = watch.getByRole("status");
  await expect(add).toHaveText("Added to bag");
  await expect(status).toHaveText("Added to bag · Qty 1");
  await expect(status).toBeInViewport();
  await expect(page.getByRole("button", { name: "Shopping bag, 1 item" })).not.toBeInViewport();
  await add.click();
  await expect(status).toHaveText("Added to bag · Qty 2");
  await expect(catalog.getByRole("status").filter({ hasText: "Added to bag" })).toHaveCount(1);
  await expect(watch.getByRole("button", { name: "Save item", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("catalog-confirmation.png"), animations: "disabled" });
});

test("shopping a pendant finish respects fixture stock and links back to the correct set", async ({ page }, testInfo) => {
  await page.goto("/shop/f-pendant");
  await expect(page.getByRole("heading", { name: "Silver Cross Pendant", level: 1 })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Black inlay" })).toBeChecked();
  await page.getByRole("radio", { name: "Silver finish" }).check();
  await expect(page.getByText("4 units available in demo stock")).toBeVisible();
  await loadPhotos(page);
  await page.screenshot({ path: testInfo.outputPath("product-desktop.png"), animations: "disabled" });
  const add = page.getByRole("button", { name: "Add to demo bag" });
  for (let quantity = 0; quantity < 4; quantity += 1) await add.click();
  await expect(add).toBeDisabled();
  await expect(page.getByText("Demo stock limit reached for this option")).toBeVisible();
  await page.getByRole("radio", { name: "Black inlay" }).check();
  await add.click();
  await page.getByRole("button", { name: "Shopping bag, 5 items" }).click();
  const bag = page.getByRole("dialog", { name: "Your demo bag" });
  await expect(bag.getByText("Subtotal")).toHaveText("Subtotal $240.00");
  await expect(bag.getByRole("button", { name: "Increase quantity of Silver Cross Pendant, Silver finish" })).toBeDisabled();
  await bag.getByRole("button", { name: "Remove Silver Cross Pendant, Silver finish from bag" }).click();
  await expect(bag.getByText("Subtotal")).toHaveText("Subtotal $48.00");
  await expect(bag.getByRole("combobox", { name: "Change option for Silver Cross Pendant" })).toHaveValue("f-pendant");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Save item", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "View in Monochrome Street" }).click();
  await expect(page).toHaveURL(/\/looks\/monochrome-street\?item=f-pendant$/);
});

for (const width of [1672, 768, 390]) {
  test("hands off the exact lipstick shade between the shop and studio at " + width + "px", async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 941 });
    await page.goto("/studio/beauty");
    await page.getByRole("button", { name: "Remove Satin Lipstick" }).click();
    await page.goto("/shop?category=makeup&q=satin+lipstick");
    await page.getByRole("link", { name: "Satin Lipstick", exact: true }).click();
    const mulberry = page.getByRole("radio", { name: "Mulberry" });
    const tryShade = page.getByRole("link", { name: "Try this shade" });
    await mulberry.click();
    await expect(mulberry).toBeChecked();
    await expect(tryShade).toHaveAttribute("href", /item=b-lipstick&shade=berry$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await tryShade.scrollIntoViewIfNeeded();
    await loadPhotos(page);
    await page.screenshot({ path: testInfo.outputPath("lipstick-product.png"), animations: "disabled" });

    await tryShade.click();
    const swatches = page.getByRole("group", { name: "Lipstick shades" });
    const lip = page.getByRole("region", { name: "Beauty model preview" }).locator('[data-effect="lips"]');
    await expect(swatches.getByRole("button", { name: "Mulberry" })).toHaveAttribute("aria-pressed", "true");
    await expect(lip).toHaveAttribute("fill", "#844256");
    await expect(page.getByRole("button", { name: "Remove Satin Lipstick" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const viewProduct = page.getByRole("link", { name: "View product", exact: true });
    await viewProduct.scrollIntoViewIfNeeded();
    await loadPhotos(page);
    await page.screenshot({ path: testInfo.outputPath("lipstick-studio.png"), animations: "disabled" });
    await swatches.getByRole("button", { name: "Dusty Rose" }).click();
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await expect(mulberry).toBeChecked();

    await tryShade.click();
    await expect(lip).toHaveAttribute("fill", "#844256");
    await swatches.getByRole("button", { name: "Dusty Rose" }).click();
    await expect(lip).toHaveAttribute("fill", "#A85F62");
    await viewProduct.click();
    await expect(page).toHaveURL(/\/shop\/b-lipstick\?shade=rose$/);
    await expect(page.getByRole("radio", { name: "Dusty Rose" })).toBeChecked();
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await expect(lip).toHaveAttribute("fill", "#A85F62");
    await page.reload();
    await expect(lip).toHaveAttribute("fill", "#A85F62");
  });
}

for (const width of [768, 390]) {
  test("catalog and product fit " + width + "px", async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop?category=makeup");
    await loadPhotos(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expectAlignedActions(page, width === 390 ? 2 : 3);
    await page.screenshot({ path: testInfo.outputPath("catalog-" + width + ".png"), animations: "disabled" });
    if (width === 390) {
      const lipstick = page.getByRole("group", { name: "Satin Lipstick shopping actions", exact: true });
      await lipstick.getByRole("button", { name: "Add to demo bag" }).scrollIntoViewIfNeeded();
      await lipstick.getByRole("button", { name: "Add to demo bag" }).click();
      await expect(page.getByText("Added to bag · Qty 1")).toBeInViewport();
    }
    await page.getByRole("link", { name: "Satin Lipstick", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Satin Lipstick", level: 1 })).toBeVisible();
    await page.getByRole("radio", { name: "Mulberry" }).click();
    await expect(page.getByText("6 units available in demo stock")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await loadPhotos(page);
    await page.screenshot({ path: testInfo.outputPath("product-" + width + ".png"), fullPage: true, animations: "disabled" });
  });
}


test("returns to the selected catalog page at the previous scroll position", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 720 });
  const listing = "/shop?category=makeup&price=under-35&sort=name&page=2";
  await page.goto(listing);
  const products = page.getByRole("list", { name: "Catalog products" });
  const product = products.getByRole("link").nth(4);
  await product.evaluate((link) => link.scrollIntoView({ block: "center" }));
  const previousScroll = await page.evaluate(() => scrollY);
  expect(previousScroll).toBeGreaterThan(500);
  await product.click();
  await expect(page).toHaveURL(/\/shop\/[^?]+\?from=/);
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(/page=2$/);
  await expect(page.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  const filters = page.getByRole("list", { name: "Active filters" });
  await expect(filters.getByRole("link", { name: "Remove filter: Under $35" })).toBeVisible();
  await expect(filters.getByRole("link", { name: "Remove filter: Name, A to Z" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(previousScroll);
  await expect(product).toBeFocused();
  await loadPhotos(page);
  await page.screenshot({ path: testInfo.outputPath("catalog-return-mobile.png"), animations: "disabled" });
});

test("suggests the matching category when a search has no results", async ({ page }, testInfo) => {
  await page.goto("/shop?category=fashion&q=satin+lipstick&price=over-75&sort=name");
  await expect(page.getByRole("heading", { name: "No matching products" })).toBeVisible();
  const filters = page.getByRole("list", { name: "Active filters" });
  await expect(filters.getByRole("link", { name: "Remove filter: Search: satin lipstick" })).toBeVisible();
  await expect(filters.getByRole("link", { name: "Remove filter: Over $75" })).toBeVisible();
  const recovery = page.getByRole("navigation", { name: "Explore more products" });
  await expect(recovery.getByRole("link", { name: "Reset search and filters" })).toHaveAttribute("href", "/shop?category=fashion");
  await page.screenshot({ path: testInfo.outputPath("search-recovery.png"), animations: "disabled" });
  await recovery.getByRole("link", { name: "Makeup" }).click();
  await expect(page).toHaveURL(/\/shop\?category=makeup&q=satin\+lipstick$/);
  await expect(page.getByRole("link", { name: "Satin Lipstick", exact: true })).toBeVisible();
});

test("a phone shopper can zoom a photo and add the chosen shade from the mobile bar", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 520 });
  await page.goto("/shop/b-lipstick");
  const photo = page.getByRole("button", { name: "Enlarge photo of Satin Lipstick" });
  await photo.click();
  const photoDialog = page.getByRole("dialog", { name: "Satin Lipstick photo" });
  await expect(photoDialog).toBeVisible();
  await expect(photoDialog.getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(photo).toBeFocused();

  await page.getByRole("radio", { name: "Mulberry" }).click();
  const primary = page.getByRole("button", { name: "Add to demo bag" });
  await primary.scrollIntoViewIfNeeded();
  const quick = page.getByRole("group", { name: "Quick add to bag" });
  await expect(quick).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(primary).not.toBeInViewport();
  await expect(quick).toBeInViewport();
  await expect(quick).toContainText("Mulberry · $28.00");
  await quick.getByRole("button", { name: "Add to bag" }).click();
  await expect(quick).toContainText("Added to bag · Qty 1");
  await loadPhotos(page);
  await page.screenshot({ path: testInfo.outputPath("mobile-quick-add.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Shopping bag, 1 item" }).click();
  const bag = page.getByRole("dialog", { name: "Your demo bag" });
  await expect(bag.getByRole("combobox", { name: "Change option for Satin Lipstick" })).toHaveValue("b-lipstick:berry");
  await bag.getByRole("link", { name: /checkout/i }).click();
  await expect(page.getByRole("heading", { name: "Demo checkout" })).toBeVisible();
  await expect(page.getByText(/Delivery and returns will be available/)).toBeVisible();
});

test("both studios return to the originating set and selected product", async ({ page }) => {
  await page.goto("/looks/monochrome-street?set=rose-occasion&item=f-pearl-necklace");
  await page.getByRole("link", { name: "Open virtual fitting room" }).click();
  await expect(page).toHaveURL(/studio\/fashion\?set=rose-occasion&item=f-pearl-necklace$/);
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select Pearl Solitaire Necklace", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/looks/soft-rose-edit?set=warm-bronze&item=b-apricot-blush");
  await page.getByRole("link", { name: "Open virtual makeup try-on" }).click();
  await expect(page).toHaveURL(/studio\/beauty\?set=warm-bronze&item=b-apricot-blush$/);
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select Apricot Cream Blush", exact: true })).toHaveAttribute("aria-pressed", "true");
});


test("a mobile shopper reviews only selected items, changes a bag option, and undoes a removal", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/fashion");
  const connection = await page.context().newCDPSession(page);
  await connection.send("Network.emulateNetworkConditions", {
    offline: false, latency: 400, downloadThroughput: 200000, uploadThroughput: 75000, connectionType: "cellular3g",
  });
  const reviewButton = page.getByRole("button", { name: "Review outfit" });
  await reviewButton.click();
  const review = page.getByRole("dialog", { name: "Review your look" });
  await expect(review.getByText("Checking availability…")).toBeVisible();
  await review.getByRole("checkbox", { name: /Essential White Tee/ }).uncheck();
  await expect(review.getByText("$306.00", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("look-review-mobile.png"), animations: "disabled" });
  await review.getByRole("button", { name: "Add selected to bag" }).click();
  await expect(reviewButton).toBeFocused();
  await connection.send("Network.emulateNetworkConditions", {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
  });
  await page.setViewportSize({ width: 390, height: 560 });
  await page.getByRole("button", { name: "Shopping bag, 4 items" }).click();
  const bag = page.getByRole("dialog", { name: "Your demo bag" });
  const checkout = bag.getByRole("link", { name: "Review demo checkout" });
  await expect(checkout).toBeInViewport({ ratio: 1 });
  await bag.getByRole("region", { name: "Bag items" }).evaluate((items) => {
    items.scrollTop = items.scrollHeight;
  });
  await expect.poll(() => bag.getByRole("region", { name: "Bag items" }).evaluate((items) => items.scrollTop)).toBeGreaterThan(0);
  await expect(checkout).toBeInViewport({ ratio: 1 });
  await expect(bag.getByText("Subtotal")).toBeInViewport();
  const option = bag.getByRole("combobox", { name: "Change option for Silver Cross Pendant" });
  await option.selectOption("f-pendant:silver");
  await bag.getByRole("button", { name: "Remove Silver Cross Pendant, Silver finish from bag" }).click();
  await bag.getByRole("button", { name: "Undo removal" }).click();
  await expect(option).toHaveValue("f-pendant:silver");
  await expect(bag.getByText("Subtotal")).toHaveText("Subtotal $306.00");
  await expect(bag.getByText("Essential White Tee")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("bag-options-mobile.png"), animations: "disabled" });
  const items = bag.getByRole("region", { name: "Bag items" });
  const previousBagScroll = await items.evaluate((element) => {
    element.scrollTop = 180;
    return element.scrollTop;
  });
  expect(previousBagScroll).toBeGreaterThan(0);
  await bag.getByRole("link", { name: "Review demo checkout" }).click();
  await expect(page.getByRole("heading", { name: "Demo checkout" })).toBeVisible();
  await expect(page.getByText("Silver finish · Qty 1")).toBeVisible();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(bag).toBeVisible();
  await expect.poll(() => items.evaluate((element) => element.scrollTop)).toBe(previousBagScroll);
});

test("a product type filter returns with the rest of the catalog context", async ({ page }) => {
  await page.goto("/shop?category=accessories");
  await page.getByRole("combobox", { name: "Product type" }).selectOption("earrings");
  await page.getByRole("button", { name: "Apply filters" }).click();
  const chip = page.getByRole("link", { name: "Remove filter: Earrings" });
  await expect(chip).toBeVisible();
  await page.getByRole("link", { name: "Freshwater Pearl Drop Earrings", exact: true }).click();
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(chip).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Product type" })).toHaveValue("earrings");
});


test("phone filters can be applied, removed, and dismissed without changing the results", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto("/shop?category=accessories");
  const trigger = page.getByRole("button", { name: /^Filter/ });
  const dialog = page.getByRole("dialog", { name: "Filter products" });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox", { name: "Price" }).selectOption("over-75");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/category=accessories$/);

  await trigger.click();
  await expect(dialog.getByRole("combobox", { name: "Price" })).toHaveValue("");
  await dialog.getByRole("combobox", { name: "Product type" }).selectOption("earrings");
  await page.screenshot({ path: testInfo.outputPath("catalog-filter-mobile.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "Apply filters" }).click();
  await expect(dialog).toBeHidden();
  const chip = page.getByRole("link", { name: "Remove filter: Earrings" });
  await expect(chip).toBeInViewport();
  await expect(page.getByRole("link", { name: "Freshwater Pearl Drop Earrings", exact: true })).toBeVisible();
  await chip.click();
  await expect(chip).toHaveCount(0);
  await expect(page).toHaveURL(/category=accessories$/);

  await trigger.click();
  await page.setViewportSize({ width: 900, height: 720 });
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("combobox", { name: "Product type" })).toBeVisible();
});


test("the featured styling edit carries its selected outfit into the fitting room", async ({ page }, testInfo) => {
  await page.goto("/looks");
  await page.getByRole("link", { name: /One Piece, Two Ways/ }).click();
  await expect(page.getByRole("heading", { name: "One Piece, Two Ways", level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: /wearing Rose satin dress, Taupe Bow Ballet Flats/ })).toBeVisible();
  await page.getByRole("button", { name: "Evening", exact: true }).click();
  await expect(page).toHaveURL(/\?style=evening$/);
  await expect(page.getByRole("img", { name: /wearing Rose satin dress, Champagne Satin Slingbacks/ })).toBeVisible();
  await page.getByRole("button", { name: "View Pearl Solitaire Necklace on the outfit" }).click();
  await expect(page.getByRole("heading", { name: "Pearl Solitaire Necklace" })).toBeVisible();
  await page.getByRole("list", { name: "Pieces in this outfit" }).getByRole("button", { name: /Rose Satin Envelope Clutch/ }).click();
  await expect(page.getByRole("heading", { name: "Rose Satin Envelope Clutch" })).toBeVisible();
  await loadPhotos(page);
  await page.screenshot({ path: testInfo.outputPath("two-ways-desktop.png"), animations: "disabled" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Evening", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Try this look" }).click();
  await expect(page).toHaveURL(/\/studio\/fashion\?style=evening$/);
  const fitting = page.getByRole("list", { name: "Pieces in your look" });
  await expect(fitting.getByText("Rose Satin Envelope Clutch")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 740 });
  await page.getByRole("button", { name: "Full-screen preview" }).click();
  const preview = page.getByRole("dialog", { name: "Outfit preview" });
  await preview.getByRole("combobox", { name: "Piece" }).selectOption("f-taupe-flats");
  await preview.getByRole("button", { name: "Try piece" }).click();
  await expect(preview.getByRole("img", { name: /Taupe Bow Ballet Flats/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("outfit-preview-mobile.png"), animations: "disabled" });
  await preview.getByRole("button", { name: "Close preview" }).click();
  await expect(fitting.getByText("Taupe Bow Ballet Flats")).toBeVisible();
  await expect(fitting.getByText("Champagne Satin Slingbacks")).toHaveCount(0);
  await page.getByRole("button", { name: "Review outfit" }).click();
  await expect(page.getByRole("dialog", { name: "Review your look" }).getByRole("checkbox", { name: /Taupe Bow Ballet Flats/ })).toBeChecked();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: "Evening", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Rose Satin Envelope Clutch" })).toBeVisible();
});


test("Back reopens the bag after checkout and keeps the originating product", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto("/shop/f-pendant");
  await page.getByRole("button", { name: "Add to demo bag" }).click();
  await page.getByRole("button", { name: "Shopping bag, 1 item" }).click();
  const bag = page.getByRole("dialog", { name: "Your demo bag" });
  await bag.getByRole("link", { name: "Review demo checkout" }).click();
  await expect(page.getByRole("heading", { name: "Demo checkout" })).toBeVisible();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/shop\/f-pendant$/);
  await expect(bag).toBeVisible();
  await expect(bag.getByText("Silver Cross Pendant", { exact: true })).toBeVisible();
});

test("Back uses local browsing history and gives a direct product visit a useful fallback", async ({ page }) => {
  await page.goto("/shop/f-pendant");
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/shop\?category=accessories$/);

  await page.getByRole("link", { name: "FAIRY home" }).click();
  await page.getByRole("link", { name: "Shop interactive looks", exact: true }).click();
  await page.getByRole("region", { name: "Fashion sets" }).getByRole("link", { name: "Monochrome Street", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Silver Cross Pendant" })).toBeVisible();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/looks$/);
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});


test("Back follows in-site navigation without the Navigation API", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "navigation", { value: undefined }));
  await page.goto("/");
  await page.getByRole("link", { name: "Shop interactive looks", exact: true }).click();
  await page.getByRole("region", { name: "Fashion sets" }).getByRole("link", { name: "Monochrome Street", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Silver Cross Pendant" })).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/looks$/);
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
