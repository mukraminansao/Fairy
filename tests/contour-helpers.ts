import type { Page } from "@playwright/test";

export async function addContourProduct(page: Page) {
  await page.getByRole("group", { name: "Areas to style" }).getByRole("button", { name: /^contour$/i }).click();
  const picker = page.getByRole("dialog", { name: "Add another product" });
  await picker.getByLabel("Beauty set").selectOption("mocha-sculpt");
  await picker.getByRole("button", { name: "Add Mocha Cream Contour", exact: true }).click();
}
