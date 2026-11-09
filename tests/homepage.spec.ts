import { expect, test, type Page } from "@playwright/test";

async function loadScreenshotImages(page: Page) {
  await page.locator("main img:visible").evaluateAll((images) => Promise.all(images.flatMap((element) => {
    const { left, right } = element.getBoundingClientRect();
    if (right <= 0 || left >= innerWidth) return [];
    const image = element as HTMLImageElement;
    image.loading = "eager";
    return [image.decode()];
  })));
}

test("phone navigation exposes search and restores focus when a drawer closes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await expect(menuButton).toHaveText("");
  expect((await menuButton.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  const header = page.getByRole("banner");
  const accountButton = header.getByRole("button", { name: "Account", exact: true });
  const bagButton = header.getByRole("button", { name: "Shopping bag", exact: true });
  await expect(header.getByRole("button", { name: "Saved items", exact: true })).toHaveCount(0);
  expect((await accountButton.boundingBox())!.x).toBeGreaterThan((await bagButton.boundingBox())!.x);
  await accountButton.click();
  const account = page.getByRole("dialog", { name: "Account", exact: true });
  await expect(account).toBeVisible();
  expect((await account.boundingBox())!.width).toBeLessThan(280);
  await page.keyboard.press("Escape");
  await expect(accountButton).toBeFocused();
  await menuButton.click();
  const menu = page.getByRole("dialog", { name: "Explore FAIRY" });
  const menuLinks = menu.getByRole("navigation", { name: "Main navigation" }).getByRole("link");
  await expect(menuLinks.nth(0)).toHaveText("Home");
  await expect(menuLinks.nth(0)).toHaveAttribute("aria-current", "page");
  await expect(menuLinks.nth(1)).toHaveText("New In");
  await expect(menu.getByRole("link", { name: "Fitting Room" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Beauty Studio" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate((element) => Math.round(element.getBoundingClientRect().left))).toBe(0);
  const drawer = (await menu.boundingBox())!;
  await page.mouse.click(drawer.x + drawer.width + 6, 250);
  await expect(menu).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

  const searchButton = page.getByRole("button", { name: "Search", exact: true });
  await searchButton.click();
  const search = page.getByRole("searchbox", { name: "Search", exact: true });
  await expect(search).toBeFocused();
  expect((await page.getByRole("dialog", { name: "Search", exact: true }).boundingBox())!.height).toBeLessThan(420);
  await page.evaluate(() => { document.documentElement.dataset.fairyNavigationCheck = "same-document"; });
  await search.fill("satin lipstick");
  await search.press("Enter");
  await expect(page.getByRole("heading", { name: "Search results" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Satin Lipstick", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-fairy-navigation-check", "same-document");
});

test("featured products keep looping on their own and respect reduced motion", async ({ page }) => {
  await page.goto("/");
  const gallery = page.getByRole("group", { name: "Featured product photos" });
  await gallery.scrollIntoViewIfNeeded();
  const track = gallery.locator(":scope > div");
  await expect(gallery.getByRole("button")).toHaveCount(0);
  await expect(track).toHaveCSS("animation-iteration-count", "infinite");
  await expect.poll(() => track.evaluate((element) => Number(element.getAnimations()[0]?.currentTime ?? 0)),
    { timeout: 8500 }).toBeGreaterThan(4800);
  await gallery.press("Space");
  await expect(track).toHaveCSS("animation-play-state", "paused");
  await gallery.press("Space");
  await expect(track).toHaveCSS("animation-play-state", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(track).toHaveCSS("animation-name", "none");
});

test("opening Fashion & Outfits animates the new page and honors reduced motion", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (event) => {
      if (event.animationName === "fairyPageEnter" && event.target instanceof HTMLElement) {
        document.documentElement.dataset.enteredHeading = event.target.querySelector("h1")?.textContent ?? "";
      }
    });
  });
  await page.goto("/");
  await page.getByRole("region", { name: "Shop by world" }).getByRole("link", { name: /Fashion & Outfits/ }).click();
  await expect(page.getByRole("heading", { name: "Fashion & Outfits" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-entered-heading", "Fashion & Outfits");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "FAIRY home" }).click();
  await expect(page.locator("main")).toHaveCSS("animation-name", "none");
});

test("desktop homepage renders at the reference viewport", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.status() + " " + response.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Everything you love.*Beautifully together/);
  await expect(page.locator("#collections li").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Discover the look" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Shop by world" })).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(page.getByRole("heading", { name: "Discover the look" })).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /Newsreader Variable/);
  await loadScreenshotImages(page);
  expect(await page.locator("header").boundingBox()).toMatchObject({ height: 102 });
  const rail = (await page.getByRole("region", { name: "Featured products" }).boundingBox())!;
  expect(rail.y).toBe(538);
  expect(await page.locator("#collections").boundingBox()).toMatchObject({ y: rail.y + rail.height });
  expect(await page.locator("#collections > ul").boundingBox()).toMatchObject({ y: rail.y + rail.height + 84 });
  const iconHref = await page.locator('link[rel="icon"]').first().getAttribute("href");
  expect((await page.request.get(iconHref!)).ok()).toBe(true);
  expect(failures).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), animations: "disabled" });
});

test("collection cards and campaign links reach their destinations", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore collections" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { name: "The FAIRY catalog" })).toBeInViewport();
  await expect(page.getByRole("navigation", { name: "Catalog categories" })).toBeVisible();
  for (const [label, id] of [
    ["Fashion & Outfits", "fashion"], ["Makeup", "makeup"], ["Skincare", "skincare"],
    ["Accessories", "accessories"], ["Fragrance", "fragrance"],
  ]) {
    await page.goto("/#collections");
    await page.locator("#collections > ul").getByRole("link", { name: new RegExp(label + "$") }).click();
    await expect(page).toHaveURL(new RegExp("/shop\\?category=" + id + "$"));
    await expect(page.getByRole("region", { name: label, exact: true })).toBeVisible();
  }
  await page.goto("/");
  await page.getByRole("link", { name: "Shop interactive looks", exact: true }).click();
  await expect(page).toHaveURL(/\/looks$/);
  await expect(page.getByRole("heading", { name: "Shop interactive looks" })).toBeInViewport();
  await expect(page.getByRole("region", { name: "Beauty edits" }).getByRole("link", { name: "Soft Rose Edit" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await loadScreenshotImages(page);
  await page.screenshot({ path: testInfo.outputPath("looks-desktop.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("region", { name: "Fashion sets" }).getByRole("link", { name: "Monochrome Street" }).click();
  await expect(page).toHaveURL(/looks\/monochrome-street$/);
  await expect(page.getByRole("heading", { name: "Silver Cross Pendant" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "Shop this item: Satin Lipstick" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/looks\/soft-rose-edit\?item=b-lipstick$/);
  await expect(page.getByRole("heading", { name: "Satin Lipstick" })).toBeVisible();
});

test("the looks page works from the phone hero and older homepage links", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "Shop interactive looks", exact: true }).click();
  await expect(page).toHaveURL(/\/looks$/);
  await expect(page.getByRole("heading", { name: "Shop interactive looks" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await loadScreenshotImages(page);
  await page.screenshot({ path: testInfo.outputPath("looks-mobile.png"), animations: "disabled" });
  await page.getByRole("navigation", { name: "Look categories" }).getByRole("link", { name: "Beauty edits" }).click();
  const beauty = page.getByRole("region", { name: "Beauty edits" });
  await expect(beauty.getByRole("heading", { name: "Beauty edits" })).toBeInViewport();
  await beauty.getByRole("link", { name: "Warm Bronze", exact: true }).click();
  await expect(page).toHaveURL(/\/looks\/soft-rose-edit\?set=warm-bronze$/);
  await expect(page.getByRole("heading", { name: "Warm Bronze", level: 1 })).toBeVisible();
  await page.goto("/?world=looks#selection");
  await expect(page).toHaveURL(/\/looks#selection$/);
  await expect(page.getByRole("heading", { name: "Shop interactive looks" })).toBeInViewport();
});

test("search and the demo bag work across reloads", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search", exact: true });
  await search.fill("missing fixture");
  await search.press("Enter");
  await expect(page.getByRole("heading", { name: "No matching products" })).toBeVisible();
  await search.fill("satin lipstick");
  await search.press("Enter");
  const results = page.getByRole("region", { name: "Search results" });
  const lipstick = results.getByRole("listitem").filter({
    has: page.getByRole("heading", { name: "Satin Lipstick", exact: true }),
  });
  await expect(lipstick).toBeVisible();
  await expect(results.getByRole("heading", { name: "Rose Blush" })).toHaveCount(0);
  await lipstick.getByRole("button", { name: "Add to demo bag" }).click();
  await expect(lipstick.getByRole("button", { name: "Save item" })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Shopping bag, 1 item" }).click();
  const bag = page.getByRole("dialog", { name: "Your demo bag" });
  await bag.getByRole("button", { name: "Increase quantity of Satin Lipstick" }).click();
  await expect(bag.getByText("Subtotal")).toHaveText("Subtotal $56.00");
  const decrease = bag.getByRole("button", { name: "Decrease quantity of Satin Lipstick" });
  await decrease.click();
  await decrease.click();
  await expect(bag.getByText("Your bag is empty.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Shopping bag" })).toBeFocused();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Account" }).getByText("Saved items")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Saved outfits (0)" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Account" })).toContainText("Open FAIRY account");
});

for (const width of [1440, 768, 390]) {
  test("homepage fits a " + width + "px viewport", async ({ browser }, testInfo) => {
    const compact = width < 1000;
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: compact });
    await page.goto("http://127.0.0.1:3000/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await loadScreenshotImages(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath(width + ".png"), fullPage: true, animations: "disabled" });
    if (compact) {
      await page.getByRole("button", { name: "Open menu" }).tap();
      const menu = page.getByRole("dialog", { name: "Explore FAIRY" });
      await expect(menu.getByRole("searchbox")).toBeVisible();
      await menu.getByRole("link", { name: "Skincare" }).tap();
      await expect(menu).not.toBeVisible();
      await expect(page.getByRole("region", { name: "Skincare" })).toBeVisible();
      await page.goBack();
      await page.getByRole("link", { name: "Shop this item: Satin Lipstick" }).tap();
      await expect(page).toHaveURL(/looks\/soft-rose-edit\?item=b-lipstick$/);
      await expect(page.getByRole("heading", { name: "Satin Lipstick" })).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    }
    await page.close();
  });
}
