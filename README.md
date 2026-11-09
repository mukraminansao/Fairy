# FAIRY

The approved homepage leads to the Monochrome Street fashion scene and the Soft Rose Edit makeup scene. It uses Next.js App Router, React, strict TypeScript, CSS Modules, and the supplied FAIRY artwork and catalog fixtures.

## Run locally

From this directory with Node.js 24:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open [FAIRY on localhost](http://127.0.0.1:3000). The app serves the homepage, category and look previews, and product search from the local catalog. Use **Browse sets** in [Monochrome Street](http://127.0.0.1:3000/looks/monochrome-street) or [Soft Rose Edit](http://127.0.0.1:3000/looks/soft-rose-edit) to browse three fashion sets and six beauty sets. Each set has 12 clickable products in one photo, with a separate close-up for each item. Compatible pieces carry across sets in a shared look. Peach Atelier, Mocha Sculpt, and Midnight Pearl add 36 products to the beauty catalog. The studio picker can filter by set, area, or product name. The [fitting room](http://127.0.0.1:3000/studio/fashion) shows illustrated Front and Back views with head and hand close-ups. Save outfits separately from the working look, load them again, or add every piece in the current outfit to the demo bag. Saved outfits and bag contents are stored in the current browser.

In the [Virtual Beauty Studio](http://127.0.0.1:3000/studio/beauty?look=soft-rose-edit), choose shades, adjust intensity, and try matte, satin, or gloss on the sample model. The comparison slider shows the original photo alongside the applied lip, cheek, eyeshadow, and skin tint effects. The current edit, one saved look, and the demo bag are stored in the current browser. Live camera and selfie try-on are optional local development previews.

Browse the [catalog](http://127.0.0.1:3000/shop) by category, search, price, or sort order. Product pages have their own URLs and link back to the exact item in a shoppable set when available. Shade and finish choices use separate bag lines and fixture stock limits. The guest account connects to saved items, the bag, and the studios in this browser.

## Live demo on Render (free)

`render.yaml` deploys FAIRY as a Node web service on Render's free plan: **New → Blueprint**, pick this repo, and every push to `main` redeploys.

- **Build command:** `npm ci && npm run build`
- **Start command:** `npm run start:host` (Render sets `PORT`)

The demo runs without a database, so the storefront, looks, fitting room and beauty studio use the local catalog fixtures, and the bag and saved looks stay in the visitor's browser. Account sign-in and the admin need PostgreSQL (see **Local backend**). On the free plan the site sleeps when idle, so the first visit can take about a minute.

## Local backend

The public shop uses the database catalog when configured. Shoppable scenes load published hotspot coordinates from the database. The homepage and studio previews still work with local fixtures when the database is not configured. Guest bag, saved items, and studio state stay in the browser; from **Account** a signed-in shopper can explicitly copy selected guest items and saved looks. Account bag quantities and prices use the current database values, and admin stock changes do not reserve inventory.

1. Copy `.env.example` to `.env.local`. Point `DATABASE_URL` at an empty local PostgreSQL database named `fairy_dev`. PostgreSQL 17 works. If reusing the development container created for this workspace, keep the existing `.env.local` and start it with `docker start fairy-dev-postgres` when needed.
2. Set `AUTH_URL=http://127.0.0.1:3000`, a strong random `AUTH_SECRET`, `FAIRY_DEV_EMAIL=customer@fairy.test`, and a separate random `FAIRY_DEV_AUTH_PASSWORD`. Keep these values private. Local credentials are accepted only by the loopback development server.
3. Run `npm.cmd ci`, `npm.cmd run db:migrate`, and `npm.cmd run db:seed` from the build kit. Restart the local server if it was already running when the environment file changed. The seed can be rerun; existing product and inventory edits are retained.
4. Open [Account](http://127.0.0.1:3000/account) and sign in with the local email and password from `.env.local`. Browse the shop, add a variant and save an item, then open [Demo checkout](http://127.0.0.1:3000/checkout) to review the server-calculated bag.

PostgreSQL stores the catalog and variants, inventory, scenes and hotspots, users and account collections, and admin audit events. Signed-in customers can access only their own collections. Staff can view the admin catalog; administrators can change the catalog, variants, scenes and stock and read the audit log. See the [API contracts](docs/11_API_CONTRACT.md) and [role and security guide](docs/12_AUTH_ADMIN_SECURITY.md). The admin page covers status, price and inventory edits; creation and scene editing are available via the protected API. To test the admin interface, an operator can verify an existing local test identity and run npm run db:promote-local-admin -- user@fairy.test --confirm-local-promotion. The command accepts only isolated loopback databases and records the change.

For `npm.cmd run test:backend`, create a separate `fairy_test` database on the same loopback PostgreSQL instance and run the migration and seed with `DATABASE_URL` temporarily pointed at it. The test runner starts its own preview on port 3107 and uses disposable sign-in secrets. Do not run the suite against customer data.

The hosted sign-in provider has not been selected. The optional OIDC settings are for connecting a provider later. Demo checkout has no payment, shipping, or order submission.


## Live camera and selfie preview

The sample model is the default. To try the camera privately, run `npm.cmd run camera:setup`, add `FAIRY_CAMERA_PREVIEW=true` to `.env.local`, and restart the development server if needed. Open [Beauty Studio](http://127.0.0.1:3000/studio/beauty), choose **Use camera**, review the notice, then choose **Start camera**. The browser may ask for permission. **Show makeup** switches between the unedited and edited live view. **Take photo** pauses the live preview, stops the camera, and opens the original frame in the same private before/after editor as an uploaded selfie. **Stop camera** returns to the sample model.

For a still photo, choose **Upload selfie** and pick a JPG, PNG, or WebP under 15 MB. The photo is read locally and discarded when you remove it or leave the studio. This mode does not need camera access. Drag the Before/After slider to compare the unedited and edited photo. If the preview panel blocks the camera, open the studio URL directly in Chrome or Edge and allow camera permission there.

Select a contour product, choose **Draw contour**, and drag or tap where you want the shade. Use **Brush size**, **Blend contour**, or **Blend amount** to adjust it, then choose **Done drawing** to bring back the comparison slider. Keyboard users can focus the drawing surface, move with the arrow keys, and press Space to start or finish a stroke. To draw from the live camera, choose **Take photo** first. Model strokes can be saved with the look. Strokes on selfies or camera photos stay in the current preview and are discarded with the photo.

The preview runs on loopback during development. Physical phones need a trusted HTTPS development address configured by the operator as FAIRY_CAMERA_DEV_ORIGIN, with that host forwarded to Next.js. The default setup does not expose the development server to other devices. Camera frames and face coordinates are kept in memory; they are not recorded, sent to a server, or included in saved looks. A browser worker tracks one face using local MediaPipe runtime files. The worker’s network policy permits same-origin requests only. FAIRY requests video only, and stops the tracks when the studio is closed, hidden, or reset. Poor lighting, strong angles and occlusion may prevent tracking. Colours are a simulation and have not been calibrated against physical products.

The setup command pins [Google’s Face Landmarker model](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker), verifies its SHA-256 and prepares the locally served worker and WebAssembly files. Review the [MediaPipe privacy notice](https://developers.google.com/edge/mediapipe/solutions/privacy) and the [Face Mesh model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf) before any distribution. The local feature flag does not enable this feature in production. Device testing and privacy signoff are still required before public release.

To test without a physical camera, install Pillow, run `python scripts/camera-test-feed.py`, then `npm.cmd run test:camera`. The simulated camera uses the existing FAIRY model photo. The fashion fitting room continues to use the approved illustrated front and back views.

## Verify

For a production-mode run with a fresh disposable demo database, use `npm.cmd run release:rehearse`. See the [local release rehearsal](docs/13_RELEASE_REHEARSAL.md) for setup and the checks it runs.

With Google Chrome installed:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Playwright starts the local dev server on port 3000 when needed. Its screenshots are saved under `test-results/`. See the [beauty expansion review](qa/beauty-expansion/README.md), [camera preview review](qa/camera/README.md), [account and checkout previews](qa/backend/README.md), [homepage comparison](qa/homepage/README.md), [Monochrome Street comparison](qa/fashion/README.md), [Soft Rose Edit comparison](qa/makeup/README.md), [mix-and-match previews](qa/mix-sets/README.md), [Virtual Beauty Studio comparison](qa/beauty-studio/README.md), [fitting room review](qa/fitting-room/README.md), and [storefront review](qa/storefront/README.md) for the reviewed captures.

The design target lives under `assets/references/`. Revised campaign and category photos are in `public/assets/homepage/`. These standalone images were generated against the approved composition for the homepage review. The original product and scene photos remain in the handoff, and the small blossom detail comes from the supplied campaign photograph. The [handoff plan](docs/01_MASTER_IMPLEMENTATION_PLAN.md) defines the remaining stages.

