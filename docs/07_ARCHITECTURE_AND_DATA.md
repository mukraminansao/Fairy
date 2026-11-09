# 07 — FAIRY application architecture and data flow

This specifies the **locked full-stack implementation**, not a deployed app. The fixed technologies, schema and endpoints are detailed in `09_LOCKED_TECH_STACK.md`, `10_DATABASE_SCHEMA.md`, `11_API_CONTRACT.md` and `12_AUTH_ADMIN_SECURITY.md`. Prototype fixture adapters remain available for screenshot gates before a database is running, but the real commerce data source must be PostgreSQL/Prisma.

## Application boundaries

```
Browser: React Client Components, CSS Modules, interaction state, 2D previews
  ↕ same-origin HTTPS
Next.js App Router: Server Components + route handlers + Auth.js session
  ↓ validate inputs, authorize, business services, transactions
Prisma ORM: typed repositories
  ↓
PostgreSQL: products, variants, stock, scenes, users, carts, looks, admin audit

Future integrations behind interfaces: object storage, payment provider,
shipping/tax provider, rigged GLB garments, camera face tracking.
```

**No browser → direct database connection.** Never expose `DATABASE_URL`, payment credentials, administrative mutations or ORM calls in client bundles. Avoid duplicating pricing and permission rules between pages and endpoints.

## Exact source layout for Codex to create

```
src/
  app/
    layout.tsx                   metadata, fonts, shared shell
    page.tsx                     homepage
    looks/page.tsx
    looks/[slug]/page.tsx        dynamic scene
    studio/beauty/page.tsx
    studio/fashion/page.tsx
    category/[slug]/page.tsx
    product/[slug]/page.tsx
    cart/page.tsx
    wishlist/page.tsx
    account/page.tsx
    checkout/page.tsx            explicitly demo-only until provider choice
    admin/(protected)/...        server-authorized admin views
    api/auth/[...nextauth]/route.ts
    api/v1/.../route.ts          endpoint table in doc 11
  components/
    layout/ home/ shoppable/ studio/ commerce/ admin/ ui/
  features/
    catalog/ scenes/ cart/ wishlist/ looks/ auth/ inventory/ orders/
  lib/
    db/prisma.ts                 server-only singleton + adapter
    validation/                 typed request validators
    authorization/              role and resource guards
    money/                      minor-unit arithmetic
    assets/                     path helpers
    services/                   business rules, transactions, audit
  styles/                       tokens.css, reset.css, scoped modules
  generated/prisma/             generated client: do not hand-edit
prisma/
  schema.prisma
  migrations/                   created and committed by Prisma migrate
  seed.ts                       catalog + scenes from provided JSON
public/assets/                 copies of the supplied non-reference assets
tests/                          unit, API, e2e, visual snapshots
```

Keep source reference screenshots in `assets/references/` for comparison; they are **not page backgrounds** and should not be shipped as public site content.

## Page routes

| Route | Page / responsibility |
|---|---|
| `/` | FAIRY landing, dark editorial hero and category browsing |
| `/looks` | All shoppable images |
| `/looks/monochrome-street` | Original streetwear photo, clickable individual items |
| `/looks/soft-rose-edit` | FAIRY makeup still life, clickable individual products |
| `/studio/beauty?look=soft-rose-edit` | Virtual face, local simulated product overlays |
| `/studio/fashion?look=monochrome-street` | Composable 2D outfit preview until true 3D assets exist |
| `/category/[slug]`, `/product/[slug]` | Discoverable commerce catalog |
| `/cart`, `/wishlist`, `/account` | User-owned shopping state and account |
| `/checkout` | Non-charging demo, with production integration explicitly disabled |
| `/admin/*` | Product, variant, scene, inventory and account administration; role-gated |

## Product/scene contract and migration

- Input data: `data/catalog.json` (23 demo products, USD minor-unit amounts) and `data/scenes.json` (2 scenes with image-space pixel coordinates).
- Preserve fixture product IDs (e.g. `f-pendant`) and scene slugs (e.g. `monochrome-street`) as stable IDs for hotspots and saved looks. Seed each via **upsert**, not duplicate inserts.
- Convert lowercase fixture categories to corresponding database enums; create at least one sellable default variant per product and its inventory record. Variants with known shades map to explicit option JSON or individual shade variants.
- Hotspot `rect=[x,y,width,height]` is measured against the natural scene image. Store `rect` as JSON with a published schema; verify bounds against `imageWidth`/`imageHeight`.
- Keep cart currency consistent, amounts as integer minor units, and all discount/tax/shipping computations on the server only. Demo amounts are not live offers.
- For visual gates 1–4, fixture adapter delivers exactly the same records when PostgreSQL is unavailable. Gate 5 switches service implementations to Prisma while keeping the page contracts unchanged.

## Future camera and real 3D boundaries

- Selfie/live camera: `getUserMedia` behind deliberate consent; stop camera tracks on closing. Default to local processing with no persisted face media. See [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- Live face landmarks can use [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js) later. 2D simulated overlays on a stock photo must be accurately labeled as a visual preview, not shade-accurate AR.
- Rigged avatar and individual garment meshes need glTF/GLB models compatible with [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). Existing transparent mannequin image is **not** a 3D model.
- Use [Playwright screenshot comparisons](https://playwright.dev/docs/test-snapshots) and provided `scripts/compare_screens.py` to chase UI fidelity before advanced functionality.

## Scope boundary

Backend infrastructure, authentication, admin tooling and the schema are specified. Payment processor, shipping/tax contracts, production hosting, supplier inventory, legal policy and licensed 3D models are **not** selected. Codex may create typed interfaces/disabled feature flags, but must not invent chargeable checkout or imply production readiness.
