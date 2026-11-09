import { expect, test } from "@playwright/test";
import { addContourProduct } from "./contour-helpers";

test("compares contour on matching sample strokes before the shopper draws", async ({ page }, info) => {
  await page.goto("/studio/beauty");
  const canvas = page.getByRole("region", { name: "Beauty model preview" });
  await canvas.getByRole("button", { name: "Compare products & shades" }).click();
  const compare = page.getByRole("dialog", { name: "Compare products & shades" });
  const a = compare.getByRole("region", { name: "Product A preview" });
  const b = compare.getByRole("region", { name: "Product B preview" });
  await a.getByRole("combobox", { name: "Product A" }).selectOption("b-mocha-cream-contour");
  await b.getByRole("combobox", { name: "Product B" }).selectOption("b-cool-sculpt-duo");
  await b.getByRole("combobox", { name: "Shade B" }).selectOption("deep-taupe");
  const strokes = "[data-contour-stroke]";
  const faceA = a.locator("svg:has(image)");
  const faceB = b.locator("svg:has(image)");
  expect((await faceA.boundingBox())!.y).toBe((await faceB.boundingBox())!.y);
  await expect(a.locator(strokes)).toHaveCount(2);
  await expect(b.locator(strokes).first()).toHaveAttribute("d", (await a.locator(strokes).first().getAttribute("d"))!);
  await expect(a.locator('[data-effect="contour"] g[stroke]')).toHaveAttribute("stroke", "#694431");
  await expect(b.locator('[data-effect="contour"] g[stroke]')).toHaveAttribute("stroke", "#6a534d");
  await expect(compare.getByText(/Contour previews use sample strokes/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("fairy-compare-contour.png"), animations: "disabled" });
  await b.getByRole("button", { name: "Use Deep Taupe (B)" }).click();
  await expect(canvas.locator(strokes)).toHaveCount(0);
  await expect(canvas.getByRole("button", { name: "Draw contour" })).toBeEnabled();
});

test("draws contour by hand, blends it into the model, and restores it with the saved look", async ({ page }, info) => {
  await page.goto("/studio/beauty?item=b-mocha-cream-contour");
  await addContourProduct(page);
  const preview = page.getByRole("region", { name: "Beauty model preview" });
  const controls = preview.getByRole("group", { name: "Contour brush" });
  const strokes = preview.locator("[data-contour-stroke]");
  const compare = preview.getByRole("slider", { name: "Compare before and after on the sample model" });
  await expect(strokes).toHaveCount(0);
  await controls.getByRole("button", { name: "Draw contour" }).click();
  await expect(compare).toHaveCount(0);
  const surface = preview.getByRole("application", { name: "Contour drawing surface" });
  const box = (await surface.boundingBox())!;
  const point = (x: number, y: number) => [box.x + box.width * x, box.y + box.height * y] as const;
  await page.mouse.move(...point(.41, .15));
  await page.mouse.down();
  await page.mouse.move(...point(.49, .11), { steps: 10 });
  await page.mouse.move(...point(.59, .15), { steps: 10 });
  await page.mouse.up();
  await expect(strokes).toHaveCount(1);
  await surface.focus();
  await surface.press("Space");
  await surface.press("Shift+ArrowDown");
  await surface.press("Space");
  await expect(strokes).toHaveCount(2);
  await controls.getByRole("button", { name: "Undo stroke" }).click();
  await expect(strokes).toHaveCount(1);
  await controls.getByRole("button", { name: "Done drawing" }).click();
  await compare.press("Home");
  const stage = preview.locator("[data-full-face]");
  const raw = await stage.screenshot({ animations: "disabled" });
  await controls.getByRole("button", { name: "Blend contour" }).click();
  await expect(controls.getByRole("slider", { name: "Blend amount" })).toHaveValue("85");
  expect((await stage.screenshot({ animations: "disabled" })).equals(raw)).toBe(false);
  const path = await strokes.first().getAttribute("d");
  await preview.getByRole("button", { name: "Zoom in" }).click();
  await expect(strokes.first()).toHaveAttribute("d", path!);
  await preview.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Save this look" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("fairy-contour-desktop.png"), animations: "disabled" });
  await page.reload();
  await controls.getByRole("button", { name: "Clear contour" }).click();
  await expect(strokes).toHaveCount(0);
  await page.getByRole("button", { name: "Load saved look" }).click();
  await expect(strokes.first()).toHaveAttribute("d", path!);
});

test("draws a continuous contour stroke with touch on mobile", async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3000/studio/beauty");
    await addContourProduct(page);
    await page.getByRole("button", { name: "Draw contour" }).click();
    const surface = page.getByRole("application", { name: "Contour drawing surface" });
    await surface.scrollIntoViewIfNeeded();
    const box = (await surface.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const point = (x: number, y: number) => ({ x: Math.round(box.x + x * box.width), y: Math.round(box.y + y * box.height) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(.72, .72)] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(.72 - .012 * i, .72 + .008 * i)] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const stroke = page.locator("[data-contour-stroke]");
    await expect(stroke).toHaveCount(1);
    expect(await stroke.getAttribute("d")).toMatch(/Q.+L/);
    await page.getByRole("button", { name: "Blend contour" }).click();
    await page.getByRole("button", { name: "Done drawing" }).click();
    await expect(page.getByRole("slider", { name: "Compare before and after on the sample model" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath("fairy-contour-mobile.png"), animations: "disabled" });
  } finally { await context.close(); }
});
