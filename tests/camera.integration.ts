import { expect, test, type Page } from "@playwright/test";
import { addContourProduct } from "./contour-helpers";

const studio = "/studio/beauty";
const dialogName = "Try makeup on camera";
type CameraSpy = Window & { captureCalls: MediaStreamConstraints[]; captureStreams: MediaStream[] };
const calls = (page: Page) => page.evaluate(() => (window as unknown as CameraSpy).captureCalls);
const trackStates = (page: Page) => page.evaluate(() => (window as unknown as CameraSpy).captureStreams.flatMap((stream) => stream.getTracks().map((track) => track.readyState)));

async function openConsent(page: Page) {
  await page.getByRole("button", { name: "Use camera" }).click();
  return page.getByRole("dialog", { name: dialogName });
}

async function startPreview(page: Page) {
  await (await openConsent(page)).getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByText("Face in view.", { exact: false })).toBeVisible({ timeout: 30_000 });
}

function makeupPixels(page: Page, region = "Live beauty preview") {
  return page.getByRole("region", { name: region }).locator("canvas[aria-hidden=true]").evaluate((element: HTMLCanvasElement) => {
    const { width, height } = element;
    const rgba = element.getContext("2d")!.getImageData(0, 0, width, height).data;
    let painted = 0;
    let signature = 0, horizontal = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] > 0) {
        painted++;
        horizontal += (i / 4) % width;
        signature += (rgba[i] * 5 + rgba[i + 1] * 3 + rgba[i + 2]) * rgba[i + 3];
      }
    }
    return { painted, signature, centerX: painted ? horizontal / painted : 0 };
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const spy = window as unknown as CameraSpy;
    spy.captureCalls = [];
    spy.captureStreams = [];
    const media = navigator.mediaDevices;
    const capture = media.getUserMedia.bind(media);
    media.getUserMedia = async (request) => {
      spy.captureCalls.push(request ?? {});
      const stream = await capture(request);
      spy.captureStreams.push(stream);
      return stream;
    };
  });
});

test("camera is off on load, declining consent leaves it off, and denial returns to the model", async ({ page }, info) => {
  await page.goto(studio);
  expect(await calls(page)).toHaveLength(0);
  const dialog = await openConsent(page);
  await expect(dialog.getByText("aren’t saved or uploaded", { exact: false })).toBeVisible();
  expect(await calls(page)).toHaveLength(0);
  await page.screenshot({ path: info.outputPath("fairy-camera-consent.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "Keep model preview" }).click();
  await expect(page.getByRole("region", { name: "Beauty model preview" })).toBeVisible();
  expect(await calls(page)).toHaveLength(0);
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = (request) => {
      (window as unknown as CameraSpy).captureCalls.push(request ?? {});
      return Promise.reject(new DOMException("Permission denied for this test", "NotAllowedError"));
    };
  });
  await (await openConsent(page)).getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByText("Camera permission was not granted", { exact: false })).toBeVisible();
  expect(await calls(page)).toEqual([expect.objectContaining({ audio: false })]);
  await expect(page.getByRole("button", { name: "Upload selfie instead" })).toBeVisible();
  await page.getByRole("button", { name: "Retry camera" }).click();
  await expect(page.getByRole("dialog", { name: "Try makeup on camera" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Use sample model" }).click();
  await expect(page.getByRole("region", { name: "Beauty model preview" })).toBeVisible();
  await expect(page.getByText("Sample model ready.")).toBeVisible();
});

test("real tracking renders the chosen shades, supports before and after, and releases the camera", async ({ page, context, request }, info) => {
  await context.grantPermissions(["camera"]);
  const tracker = await request.get("/camera-runtime/tracker.js");
  expect(tracker.status()).toBe(200);
  expect(tracker.headers()["content-security-policy"]).toContain("connect-src 'self'");
  const origin = new URL(tracker.url()).origin;
  const external: string[] = [];
  const modelRequests: string[] = [];
  const transmitted: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== origin) external.push(url.origin);
    if (url.pathname.startsWith("/camera-runtime/")) modelRequests.push(url.pathname);
    if (request.postDataBuffer()) transmitted.push(url.pathname);
  });
  await page.goto(studio);
  expect(modelRequests).toEqual([]);
  await startPreview(page);
  expect(await calls(page)).toEqual([expect.objectContaining({ audio: false })]);
  await expect.poll(async () => (await makeupPixels(page)).painted).toBeGreaterThan(1000);
  const original = await makeupPixels(page);
  const shades = page.getByRole("group", { name: "Lipstick shades" });
  await shades.getByRole("button").last().click();
  await expect.poll(async () => (await makeupPixels(page)).signature).not.toBe(original.signature);
  await page.screenshot({ path: info.outputPath("fairy-camera-live.png"), animations: "disabled" });
  await page.getByRole("switch", { name: "Show makeup" }).click();
  await expect.poll(async () => (await makeupPixels(page)).painted).toBe(0);
  await page.getByRole("switch", { name: "Show makeup" }).click();
  await expect.poll(async () => (await makeupPixels(page)).painted).toBeGreaterThan(1000);
  await page.getByRole("button", { name: "Stop camera" }).click();
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
  await expect(page.getByRole("region", { name: "Beauty model preview" })).toBeVisible();
  expect(modelRequests.some((path) => path.endsWith("face_landmarker.task"))).toBeTruthy();
  expect(external).toEqual([]);
  expect(transmitted).toEqual([]);
});

test("phone preview fits the viewport and the camera stops when leaving the studio", async ({ page, context }, info) => {
  await context.grantPermissions(["camera"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studio);
  await startPreview(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: info.outputPath("fairy-camera-390.png"), animations: "disabled" });
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/looks\/soft-rose-edit/);
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
});

test("the overlay follows a moving face and clears when the face leaves the frame", async ({ page }) => {
  await page.goto(studio);
  await page.evaluate(async () => {
    const spy = window as unknown as CameraSpy & { moveCameraFixture: (offset: number | null) => void };
    const model = new Image();
    model.src = "/assets/images/face_base_neutral.png";
    await model.decode();
    const fixture = document.createElement("canvas");
    fixture.width = 640;
    fixture.height = 480;
    const ctx = fixture.getContext("2d")!;
    const output = fixture.captureStream(24);
    let offset: number | null = -72;
    function paint() {
      ctx.fillStyle = "#ddd1c5";
      ctx.fillRect(0, 0, 640, 480);
      if (offset !== null) ctx.drawImage(model, 120, 150, 890, 1220, 145 + offset, 0, 350, 480);
    }
    spy.moveCameraFixture = (next) => { offset = next; paint(); };
    const repaint = window.setInterval(() => {
      if (output.getTracks().every((track) => track.readyState === "ended")) {
        window.clearInterval(repaint);
      } else {
        paint();
      }
    }, 40);
    navigator.mediaDevices.getUserMedia = async (request) => {
      spy.captureCalls.push(request ?? {});
      spy.captureStreams.push(output);
      return output;
    };
  });
  const move = (offset: number | null) => page.evaluate((value) => {
    (window as unknown as { moveCameraFixture: (offset: number | null) => void }).moveCameraFixture(value);
  }, offset);
  await startPreview(page);
  const start = (await makeupPixels(page)).centerX;
  await move(72);
  await expect.poll(async () => (await makeupPixels(page)).centerX).toBeGreaterThan(start + 80);
  await move(null);
  await expect(page.getByText("Face the camera in even light", { exact: false })).toBeVisible();
  await expect.poll(async () => (await makeupPixels(page)).painted).toBe(0);
  await page.getByRole("button", { name: "Stop camera" }).click();
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
});

test("chooses a selfie locally, applies the selected shade, and removes the photo", async ({ page, context, baseURL }, info) => {
  const sent: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (request.postDataBuffer() || (url.protocol.startsWith("http") && url.origin !== baseURL)) sent.push(request.url());
  });
  await page.goto(studio);
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Upload selfie", exact: true }).click(),
  ]);
  await picker.setFiles("public/assets/images/face_base_neutral.png");
  const selfie = page.getByRole("region", { name: "Selfie beauty preview" });
  await expect(selfie.getByText("Photo ready.", { exact: false })).toBeVisible({ timeout: 30000 });
  await expect(selfie.getByRole("img", { name: "Your selfie" })).toBeVisible();
  const painted = () => makeupPixels(page, "Selfie beauty preview");
  await expect.poll(async () => (await painted()).painted).toBeGreaterThan(1000);
  const before = await painted();
  await page.getByRole("group", { name: "Lipstick shades" }).getByRole("button").last().click();
  await expect.poll(async () => (await painted()).signature).not.toBe(before.signature);
  await page.screenshot({ path: info.outputPath("fairy-selfie-preview.png"), animations: "disabled" });
  await selfie.getByRole("switch", { name: "Show makeup" }).click();
  await expect.poll(async () => (await painted()).painted).toBe(0);
  expect(await calls(page)).toEqual([]);
  expect(sent).toEqual([]);
  await selfie.getByRole("button", { name: "Remove selfie" }).click();
  await expect(page.getByRole("region", { name: "Beauty model preview" })).toBeVisible();
  await expect(selfie).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "Beauty model preview" })).toBeVisible();
});

test("rejects unsupported files and allows choosing a different selfie", async ({ page }) => {
  await page.goto(studio);
  const input = page.getByLabel("Choose selfie photo");
  await input.setInputFiles({ name: "document.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  await expect(page.getByText("Choose a JPG, PNG, or WebP photo.")).toBeVisible();
  await input.setInputFiles("public/assets/images/face_base_neutral.png");
  await expect(page.getByText("Photo ready.", { exact: false })).toBeVisible({ timeout: 30000 });
  expect(await calls(page)).toEqual([]);
});


test("selfie eye shadow blends above the lashes and shows six distinct pan colors", async ({ page }, info) => {
  await page.goto(studio);
  for (const name of ["Satin Lipstick", "Rose Blush", "Skin Tint Foundation"]) {
    await page.getByRole("button", { name: "Remove " + name, exact: true }).click();
  }
  await page.getByRole("button", { name: "Customize Warm Nude Eyeshadow" }).click();
  await page.getByLabel("Choose selfie photo").setInputFiles("public/assets/images/face_base_neutral.png");
  await expect(page.getByText("Photo ready.", { exact: false })).toBeVisible({ timeout: 30000 });
  const overlay = page.getByRole("region", { name: "Selfie beauty preview" }).locator("canvas[aria-hidden=true]");
  const read = () => overlay.evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d")!;
    const at = (x: number, y: number) => Array.from(context.getImageData(
      Math.round(x * canvas.width / 1122), Math.round(y * canvas.height / 1402), 1, 1,
    ).data);
    return {
      lids: [at(365, 548), at(755, 552)],
      lashEdge: [at(365, 575)[3], at(755, 577)[3]],
      eyes: [at(412, 613)[3], at(709, 613)[3]],
      brows: [at(366, 477)[3], at(753, 477)[3]],
    };
  });
  const colors = new Set<string>();
  const palette = page.getByRole("group", { name: "Eyeshadow palette shades" });
  for (const name of ["Champagne", "Soft Coral", "Dusty Rose", "Peach Nude", "Terracotta", "Deep Bronze"]) {
    await palette.getByRole("button", { name, exact: true }).click();
    await expect.poll(async () => (await read()).lids[0][3]).toBeGreaterThan(30);
    const { lids, lashEdge, eyes, brows } = await read();
    expect(Math.min(...lashEdge)).toBeGreaterThan(10);
    expect(lids[1][3]).toBeGreaterThan(30);
    expect(eyes).toEqual([0, 0]);
    expect(brows).toEqual([0, 0]);
    colors.add(lids[0].slice(0, 3).join(","));
  }
  expect(colors.size).toBe(6);
  await palette.getByRole("button", { name: "Terracotta", exact: true }).click();
  await page.screenshot({ path: info.outputPath("fairy-refined-eyeshadow.png"), animations: "disabled" });
});


test("uses a generic webcam when a device rejects the preferred camera settings", async ({ page, context }) => {
  await context.grantPermissions(["camera"]);
  await page.goto(studio);
  await page.evaluate(() => {
    const media = navigator.mediaDevices;
    const original = media.getUserMedia.bind(media);
    media.getUserMedia = (constraints) => {
      if (constraints && typeof constraints.video === "object") {
        (window as unknown as CameraSpy).captureCalls.push(constraints);
        return Promise.reject(new DOMException("Preferred device unavailable", "OverconstrainedError"));
      }
      return original(constraints);
    };
  });
  await startPreview(page);
  expect(await calls(page)).toEqual([
    { audio: false, video: { facingMode: { ideal: "user" } } }, { audio: false, video: true },
  ]);
  await expect(page.getByRole("slider", { name: "Compare before and after on the live camera" })).toBeVisible();
  await page.getByRole("button", { name: "Stop camera" }).click();
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
});

test("compares the original selfie and applies brow, lash and eyeliner products independently", async ({ page }, info) => {
  await page.goto(studio);
  await page.getByLabel("Choose selfie photo").setInputFiles("public/assets/images/face_base_neutral.png");
  await expect(page.getByText("Photo ready.", { exact: false })).toBeVisible({ timeout: 30000 });
  const selfie = page.getByRole("region", { name: "Selfie beauty preview" });
  const stage = selfie.locator("[data-mode=selfie]");
  const slider = selfie.getByRole("slider", { name: "Compare before and after on your selfie" });
  await expect(slider).toHaveValue("50");
  await slider.press("End");
  await expect(slider).toHaveValue("100");
  const original = await stage.screenshot({ animations: "disabled" });
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
  expect((await stage.screenshot({ animations: "disabled" })).equals(original)).toBe(false);
  const lipCoverage = await selfie.locator("canvas[aria-hidden=true]").evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d")!;
    return [[426, 993], [711, 995], [568, 1063], [566, 947], [568, 996]].map(([x, y]) =>
      ctx.getImageData(Math.round(x * canvas.width / 1122), Math.round(y * canvas.height / 1402), 1, 1).data[3]);
  });
  expect(Math.min(...lipCoverage)).toBeGreaterThan(50);

  const areas = page.getByRole("group", { name: "Areas to style" });
  const productDialog = page.getByRole("dialog", { name: "Add another product" });
  const read = () => makeupPixels(page, "Selfie beauty preview");
  for (const [area, product] of [
    ["brows", "Amber Brow Gel"], ["lashes", "Defining Mascara"],
    ["eyeliner", "Burgundy Eye Pencil"],
  ]) {
    const previous = (await read()).signature;
    await areas.getByRole("button", { name: area, exact: true }).click();
    await productDialog.getByRole("button", { name: "Add " + product, exact: true }).click();
    await expect.poll(async () => (await read()).signature).not.toBe(previous);
  }
  await slider.fill("50");
  await page.screenshot({ path: info.outputPath("fairy-selfie-comparison.png"), animations: "disabled" });
  await selfie.getByRole("button", { name: "Remove selfie" }).click();
  const model = page.getByRole("region", { name: "Beauty model preview" });
  for (const effect of ["brows", "lashes", "eyeliner"]) {
    await expect(model.locator('[data-effect="' + effect + '"]').first()).toBeAttached();
  }
});


test("takes an unedited camera photo, stops the webcam, and keeps comparison controls", async ({ page, context }, info) => {
  await context.grantPermissions(["camera"]);
  const uploads: string[] = [];
  context.on("request", (request) => { if (request.postDataBuffer()) uploads.push(request.url()); });
  await page.goto(studio);
  await addContourProduct(page);
  await startPreview(page);
  await expect(page.getByText("Choose Take photo to draw contour on a still frame.")).toBeVisible();
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  const selfie = page.getByRole("region", { name: "Selfie beauty preview" });
  await expect(selfie.getByText("Photo ready.", { exact: false })).toBeVisible({ timeout: 30000 });
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
  await expect(page.getByRole("region", { name: "Live beauty preview" })).toHaveCount(0);
  await expect(selfie.getByRole("slider", { name: "Compare before and after on your selfie" })).toHaveValue("50");
  await expect(selfie.getByRole("button", { name: "Draw contour" })).toBeEnabled();
  await selfie.getByRole("button", { name: "Compare products & shades" }).click();
  const compare = page.getByRole("dialog", { name: "Compare products & shades" });
  await expect(compare.getByRole("region", { name: "Product A preview" }).locator("svg image"))
    .toHaveAttribute("href", "/assets/images/studio-sample-medium.webp");
  await compare.getByRole("button", { name: "Close comparison" }).click();
  await expect(selfie.getByRole("slider", { name: "Compare before and after on your selfie" })).toHaveValue("50");
  expect(uploads).toEqual([]);
  await page.screenshot({ path: info.outputPath("fairy-camera-capture.png"), animations: "disabled" });
});

test("draws and blends contour privately on a selfie and keeps the original comparison", async ({ page, context }, info) => {
  const uploads: string[] = [];
  context.on("request", (request) => { if (request.postDataBuffer()) uploads.push(request.url()); });
  await page.goto(studio);
  await addContourProduct(page);
  await page.getByLabel("Choose selfie photo").setInputFiles("public/assets/images/face_base_neutral.png");
  await expect(page.getByText("Photo ready.", { exact: false })).toBeVisible({ timeout: 30000 });
  const selfie = page.getByRole("region", { name: "Selfie beauty preview" });
  const stage = selfie.locator("[data-mode=selfie]");
  const compare = selfie.getByRole("slider", { name: "Compare before and after on your selfie" });
  await compare.press("Home");
  await compare.blur();
  const beforePaint = await stage.screenshot({ animations: "disabled" });
  await compare.press("End");
  await compare.blur();
  const original = await stage.screenshot({ animations: "disabled" });
  await selfie.getByRole("button", { name: "Draw contour" }).click();
  await expect(compare).toHaveCount(0);
  const surface = selfie.getByRole("application", { name: "Contour drawing surface" });
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * .65, box.y + box.height * .7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .74, box.y + box.height * .66, { steps: 9 });
  await page.mouse.up();
  await expect(selfie.locator("[data-contour-stroke]")).toHaveCount(1);
  await selfie.getByRole("button", { name: "Blend contour" }).click();
  await selfie.getByRole("button", { name: "Done drawing" }).click();
  await expect(compare).toHaveValue("100");
  expect((await stage.screenshot({ animations: "disabled" })).equals(original)).toBe(true);
  await compare.press("Home");
  await compare.blur();
  expect((await stage.screenshot({ animations: "disabled" })).equals(beforePaint)).toBe(false);
  await page.getByRole("button", { name: "Save this look" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("fairy-contour-selfie.png"), animations: "disabled" });
  await selfie.getByRole("button", { name: "Remove selfie" }).click();
  await page.getByRole("button", { name: "Load saved look" }).click();
  await expect(page.locator("[data-contour-stroke]")).toHaveCount(0);
  expect(uploads).toEqual([]);
});

