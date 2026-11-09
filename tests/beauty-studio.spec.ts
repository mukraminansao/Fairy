import { expect, test, type Page } from "@playwright/test";

const studio = "/studio/beauty?look=soft-rose-edit";
const comparison = (page: Page) => page.getByRole("slider", { name: /^Compare before and after/ });

async function loadStudioImages(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator("main img:visible").evaluateAll((images) =>
    Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
  await page.locator("main svg image").evaluateAll((layers) => Promise.all(layers.map(async (layer) => {
    const photo = new Image();
    photo.src = layer.getAttribute("href")!;
    await photo.decode();
  })));
}

test("studio matches the desktop workspace and starts with the four-piece Soft Rose Edit", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(studio);
  await expect(page.getByRole("heading", { name: "Your beauty, your way." })).toBeVisible();
  await expect(page.getByRole("list", { name: "Products in your beauty edit" }).getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("button", { name: /Review 4 products.*\$136/ })).toBeEnabled();
  await expect(page.getByRole("slider", { name: "Intensity" })).toHaveValue("75");
  await expect(page.getByRole("button", { name: "Satin", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Upload selfie" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use camera" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Sample tone" })).toHaveValue("medium");
  await loadStudioImages(page);
  const face = await comparison(page).locator("..").boundingBox();
  expect(face).toBeTruthy();
  expect(face!.x).toBeCloseTo(417, -1);
  expect(face!.width).toBeCloseTo(754, -1);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), animations: "disabled" });
});

test("edits the visual layers, resets the working look, and reloads a saved look into the demo bag", async ({ page }) => {
  await page.goto(studio);
  const lip = page.locator('[data-effect="lips"]');
  const intensity = page.getByRole("slider", { name: "Intensity" });
  const canvas = page.getByRole("region", { name: "Beauty model preview" });
  const photo = canvas.locator("svg").filter({ has: page.locator("image") });
  await page.getByRole("button", { name: "Mulberry" }).click();
  await expect(lip).toHaveAttribute("fill", "#844256");
  await intensity.focus();
  await page.keyboard.press("Home");
  await expect(lip).toHaveAttribute("opacity", "0");
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "Matte" }).click();
  const matte = await lip.getAttribute("opacity");
  await page.getByRole("button", { name: "Gloss" }).click();
  await expect(lip).not.toHaveAttribute("opacity", matte!);
  await expect(canvas.locator('[data-effect="lip-shine"]')).toBeAttached();
  await comparison(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(comparison(page)).toHaveValue("51");
  const compareSwitch = page.getByRole("switch", { name: "Compare before/after" });
  await compareSwitch.click();
  await expect(comparison(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(canvas.getByText("Zoom 125%")).toBeVisible();
  await expect(photo).not.toHaveAttribute("viewBox", "0 419 1122 814");
  await compareSwitch.click();
  await expect(comparison(page)).toHaveValue("51");

  await page.getByRole("button", { name: "Save this look" }).click();
  await expect(page.getByRole("status")).toHaveText("Look saved in this browser.");
  await page.getByRole("button", { name: "Reset look" }).click();
  await expect(lip).toHaveAttribute("fill", "#B96E67");
  await expect(intensity).toHaveValue("75");
  await expect(comparison(page)).toHaveValue("50");
  await expect(canvas.getByText("Zoom 100%")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Load saved look" }).click();
  await expect(lip).toHaveAttribute("fill", "#844256");
  await expect(lip).toHaveAttribute("data-finish", "Gloss");
  await expect(intensity).toHaveValue("100");
  await page.getByRole("button", { name: /Review 4 products/ }).click();
  await page.getByRole("dialog", { name: "Review your look" }).getByRole("button", { name: "Add selected to bag" }).click();
  await expect(page.getByRole("status")).toHaveText("4 products added to your demo bag.");
  await page.getByRole("button", { name: "Shopping bag, 4 items" }).click();
  const bag = page.getByRole("dialog", { name: "Your demo bag" });
  await expect(bag.getByRole("combobox", { name: "Change option for Satin Lipstick" })).toHaveValue("b-lipstick:berry");
  await expect(bag.getByText("Subtotal")).toHaveText("Subtotal $136.00");
});

test("chooses another set’s cheek color and removes a skin tint from the model", async ({ page }) => {
  await page.goto(studio);
  const area = page.getByRole("group", { name: "Areas to style" });
  const canvas = page.getByRole("region", { name: "Beauty model preview" });
  const skin = canvas.locator('[data-effect="skin"]');
  await area.getByRole("button", { name: "skin" }).click();
  await expect(page.getByRole("slider", { name: "Intensity" })).toHaveValue("35");
  await expect(skin).toHaveAttribute("fill", "#e8ad83");
  await page.getByRole("button", { name: "Remove Skin Tint Foundation" }).click();
  await expect(skin).toHaveCount(0);
  await page.getByRole("button", { name: "Add another product", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add another product" });
  await picker.getByRole("group", { name: "Filter products by area" }).getByRole("button", { name: "cheeks" }).click();
  await picker.getByRole("searchbox", { name: "Find a product" }).fill("Cool Berry");
  await picker.getByRole("button", { name: "Add Cool Berry Powder Blush" }).click();
  const items = page.getByRole("list", { name: "Products in your beauty edit" });
  await expect(items).toContainText("Cool Berry Powder Blush");
  await expect(items).not.toContainText("Rose Blush");
  await expect(canvas.locator('stop[stop-color="#c4628a"]').first()).toBeAttached();
  await page.reload();
  await expect(items).toContainText("Cool Berry Powder Blush");
});

for (const width of [1440, 768, 390]) {
  test("studio works at " + width + "px", async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(studio);
    await loadStudioImages(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(comparison(page)).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(width + ".png"), fullPage: true, animations: "disabled" });
    await page.getByRole("group", { name: "Areas to style" }).getByRole("button", { name: "eyes" }).click();
    await expect(page.getByRole("group", { name: "Eyeshadow palette shades" }).getByRole("button")).toHaveCount(6);
  });
}


test("compares two shades on the same sample, applies a choice, and undoes it after resuming", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studio);
  const canvas = page.getByRole("region", { name: "Beauty model preview" });
  await canvas.getByRole("combobox", { name: "Sample tone" }).selectOption("deep");
  await canvas.getByRole("button", { name: "Compare products & shades" }).click();
  const compare = page.getByRole("dialog", { name: "Compare products & shades" });
  await compare.getByRole("combobox", { name: "Shade B" }).selectOption("berry");
  const sides = compare.getByRole("region", { name: /Product [AB] preview/ });
  await expect(sides.nth(0).locator('[data-effect="lips"]')).toHaveAttribute("fill", "#B96E67");
  await expect(sides.nth(1).locator('[data-effect="lips"]')).toHaveAttribute("fill", "#844256");
  await expect(sides.nth(1).locator("svg image")).toHaveAttribute("href", "/assets/images/studio-sample-deep.webp");
  await page.screenshot({ path: testInfo.outputPath("shade-comparison-mobile.png"), animations: "disabled" });
  await compare.getByRole("button", { name: "Use Mulberry (B)" }).click();
  await expect(canvas.locator('[data-effect="lips"]')).toHaveCount(1);
  await expect(canvas.locator('[data-effect="lips"]')).toHaveAttribute("fill", "#844256");
  await page.goto("/");
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("link", { name: "Continue your beauty look" }).click();
  await expect(canvas.locator('[data-effect="lips"]')).toHaveAttribute("fill", "#844256");
  await page.getByRole("button", { name: "Undo beauty change" }).click();
  await expect(canvas.locator('[data-effect="lips"]')).toHaveAttribute("fill", "#B96E67");
});

test("compares single-shade products across sets and applies only the chosen product", async ({ page }, testInfo) => {
  await page.goto(studio);
  const foundationRow = page.getByRole("button", { name: "Customize Skin Tint Foundation", exact: true });
  await foundationRow.hover();
  await expect(foundationRow).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await foundationRow.click({ position: { x: 30, y: 2 } });
  await expect(foundationRow).toHaveAttribute("aria-pressed", "true");
  const blushName = page.getByRole("list", { name: "Products in your beauty edit" }).getByText("Rose Blush", { exact: true });
  // Click the visible name through the button that covers the row.
  await blushName.click({ force: true });
  await expect(page).toHaveURL(/\/studio\/beauty\?look=soft-rose-edit$/);
  await expect(page.getByRole("button", { name: "Customize Rose Blush", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: "View set", exact: true })).toHaveAttribute("href", "/looks/soft-rose-edit?item=b-blush");
  const trigger = page.getByRole("button", { name: "Compare products & shades" });
  await trigger.click();
  const compare = page.getByRole("dialog", { name: "Compare products & shades" });
  const a = compare.getByRole("region", { name: "Product A preview" });
  const b = compare.getByRole("region", { name: "Product B preview" });
  await expect(a.getByRole("combobox", { name: "Product A" })).toHaveValue("b-blush");
  await expect(a.getByText("One shade")).toBeVisible();
  const productB = b.getByRole("combobox", { name: "Product B" });
  await productB.selectOption("b-berry-lip");
  await expect(b.locator('[data-effect="lips"]')).toHaveAttribute("fill", "#7d2948");
  await expect(a.locator('[data-effect="lips"]')).toHaveCount(0);
  await productB.selectOption("b-berry-blush");
  await expect(a.locator('stop[stop-color="#d05366"]').first()).toBeAttached();
  await expect(b.locator('stop[stop-color="#c4628a"]').first()).toBeAttached();
  await loadStudioImages(page);
  await page.screenshot({ path: testInfo.outputPath("compare-products-desktop.png"), animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  const items = page.getByRole("list", { name: "Products in your beauty edit" });
  await expect(items).toContainText("Rose Blush");
  await trigger.click();
  await productB.selectOption("b-berry-blush");
  await compare.getByRole("button", { name: "Use Cool Berry Powder Blush (B)" }).click();
  await expect(items).toContainText("Cool Berry Powder Blush");
  await expect(items).not.toContainText("Rose Blush");
  await expect(items).toContainText("Soft Mocha Lipstick");
  await expect(trigger).toBeEnabled();
  await page.getByRole("button", { name: "Undo beauty change" }).click();
  await expect(items).toContainText("Rose Blush");
});

test("the phone preview changes a shade without losing the active product", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto(studio);
  const trigger = page.getByRole("button", { name: "Full-screen preview" });
  await trigger.click();
  const preview = page.getByRole("dialog", { name: "Makeup preview" });
  await preview.getByRole("combobox", { name: "Shade" }).selectOption("berry");
  await expect(preview.locator('[data-effect="lips"]')).toHaveAttribute("fill", "#844256");
  await page.screenshot({ path: testInfo.outputPath("makeup-preview-mobile.png"), animations: "disabled" });
  await preview.getByRole("button", { name: "Close preview" }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("region", { name: "Beauty model preview" }).locator('[data-effect="lips"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Mulberry", exact: true })).toHaveAttribute("aria-pressed", "true");
});
