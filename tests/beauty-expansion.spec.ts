import { expect, test } from "@playwright/test";
import sceneData from "../data/scenes.json";
import catalog from "../data/catalog.json";

const route = "/looks/soft-rose-edit";
const expansion = ["peach-atelier", "mocha-sculpt", "midnight-pearl"] as const;

for (const id of expansion) {
  const scene = sceneData.scenes.find((entry) => entry.id === id)!;
  test(scene.title + " shows twelve clickable products with dedicated close-ups", async ({ page }, info) => {
    await page.goto(route + "?set=" + id);
    await expect(page.getByRole("heading", { name: scene.title, exact: true })).toBeVisible();
    const group = page.getByRole("group", { name: "Products in " + scene.title });
    await expect(group.getByRole("button")).toHaveCount(12);
    await page.screenshot({ path: info.outputPath(id + "-scene.png"), animations: "disabled" });
    for (const { productId } of scene.hotspots) {
      const product = catalog.products.find((item) => item.id === productId)!;
      const hit = page.locator('svg path[data-item="' + productId + '"]');
      await hit.scrollIntoViewIfNeeded();
      const point = await hit.evaluate((item: SVGGeometryElement) => {
        const bounds = item.getBBox();
        for (const fx of [.5, .4, .6, .3, .7, .2, .8]) for (const fy of [.5, .35, .65, .2, .8]) {
          const p = new DOMPoint(bounds.x + bounds.width * fx, bounds.y + bounds.height * fy);
          if (item.isPointInFill(p)) {
            const screen = p.matrixTransform(item.getScreenCTM()!);
            return { x: screen.x, y: screen.y };
          }
        }
        throw Error("No clickable point inside the product.");
      });
      await page.mouse.click(point.x, point.y);
      await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
      await expect(page.getByRole("img", { name: product.name + " close-up" })).toHaveAttribute("src",
        new RegExp(product.previewImage.split("/").at(-1)!.replace(".", "\\.")));
    }
  });
}

test("browses all six beauty sets and mixes new products with independently selectable palette pans", async ({ page }, info) => {
  await page.goto(route);
  await page.getByRole("button", { name: "Browse sets" }).click();
  const sets = page.getByRole("dialog", { name: "Browse beauty sets" });
  await expect(sets.getByRole("link")).toHaveCount(6);
  await sets.getByRole("link", { name: /Mocha Sculpt/ }).click();
  await expect(page.getByRole("heading", { name: "Mocha Sculpt", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Choose a product" }).selectOption("b-espresso-satin-shadow");
  const scenePalette = page.getByRole("group", { name: "Eyeshadow palette shades" });
  await expect(scenePalette.getByRole("button")).toHaveCount(4);
  await scenePalette.getByRole("button", { name: "Espresso Matte" }).click();
  await page.getByRole("button", { name: "Add to look", exact: true }).click();
  await page.getByRole("link", { name: "Open virtual makeup try-on" }).click();
  const eyes = page.getByRole("group", { name: "Eyeshadow palette shades" });
  await expect(eyes.getByRole("button", { name: "Espresso Matte" })).toHaveAttribute("aria-pressed", "true");
  for (const [set, item] of [
    ["peach-atelier", "Nectarine Cream Blush"],
    ["midnight-pearl", "Cool Sculpt Duo"],
  ]) {
    await page.getByRole("button", { name: "Add another product" }).click();
    const picker = page.getByRole("dialog", { name: "Add another product" });
    await picker.getByLabel("Beauty set").selectOption(set);
    await expect(picker.getByRole("listitem")).toHaveCount(12);
    await picker.getByRole("button", { name: "Add " + item, exact: true }).click();
  }
  const contour = page.getByRole("group", { name: "Contour palette shades" });
  await expect(contour.getByRole("button")).toHaveCount(2);
  await contour.getByRole("button", { name: "Deep Taupe" }).click();
  await page.getByRole("button", { name: "Draw contour" }).click();
  const brush = page.getByRole("application", { name: "Contour drawing surface" });
  await brush.press("Space");
  await brush.press("Shift+ArrowDown");
  await brush.press("Space");
  await page.getByRole("button", { name: "Done drawing" }).click();
  await expect(page.locator('[data-effect="contour"]')).toBeAttached();
  const bag = page.getByRole("list", { name: "Products in your beauty edit" });
  for (const product of ["Espresso Satin Eyeshadow", "Nectarine Cream Blush", "Cool Sculpt Duo"]) {
    await expect(bag.getByRole("link", { name: product })).toBeVisible();
  }
  await page.screenshot({ path: info.outputPath("fairy-six-set-studio.png"), animations: "disabled" });
});

