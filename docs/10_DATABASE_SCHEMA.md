# 10 — PostgreSQL relational database specification

`prisma/schema.prisma` is the starting implementation artifact. It must be read together with this file. The schema is **unmigrated**, and any Prisma-major compatibility adjustment must be validated with the installed Prisma CLI before generating migrations. The seed is **not** pre-run.

## Relation map

```
User ──< Account/Session              (Auth.js identity/session)
  ├──< Address
  ├──< SavedLook ──< SavedLookItem >── ProductVariant
  ├──  Cart ──< CartItem >────────────── ProductVariant
  ├──< WishlistItem >───────────────── Product
  ├──< Order ──< OrderItem >─────────── ProductVariant
  └──< AuditLog

Product ──< ProductVariant ── Inventory (one per variant)
  ├──< ProductImage
  └──< Hotspot >── Scene
Order ──< Payment                       (future provider integration only)
```

## Key models and constraints

| Model | Purpose and main fields | Critical invariant |
|---|---|---|
| `User`, `Account`, `Session`, `VerificationToken` | Auth.js adapter persistence, email, role, verified state | Unique email when provided; only server can assign non-customer role |
| `Product` | Stable demo ID, unique slug/SKU, category, status, copy, base currency | Archive rather than delete products referenced by cart/orders |
| `ProductVariant` | SKU, shade/size options JSON, `priceMinor`, currency, active flag | Unique SKU; all prices integer and nonnegative |
| `ProductImage` | Stable source asset path, alt text, sort order | Asset references belong to actual product |
| `Inventory` | One variant, available and reserved quantity | Prevent negative values; future stock reservation in transaction |
| `Scene`, `Hotspot` | Slug, intrinsic image dimensions, z-order, source `rect` JSON | Hotspot foreign key and bounds verified against image size |
| `SavedLook`, `SavedLookItem` | Owned outfit/beauty choices; JSON intensity/shade config | Owner authorization and valid variant references |
| `Cart`, `CartItem` | Owned cart + unique variant lines | Server recomputes price/totals; quantity in bounded range |
| `WishlistItem` | Unique user-product pair | Only owner can mutate |
| `Address` | User-owned delivery details | Not accessible to another user |
| `Order`, `OrderItem` | Immutable price/currency/item snapshots for later checkout | Never manufacture paid status from browser/client |
| `Payment` | Future provider reference and status | No production mutation while provider is undecided |
| `AuditLog` | Actor, action, target, timestamp, limited details | Required for product/variant/inventory/scene/admin changes |

## Pricing, variant and inventory rules

1. All demo values in `data/catalog.json` use `priceCents`; map these to `ProductVariant.priceMinor` and `currency='USD'` (demo only). The schema deliberately uses `priceMinor` so future PHP prices can use the currency's minor units without renaming tables.
2. One default variant is required for every product; lipstick known shades should create six variant rows with options such as `{ "shadeId": "soft-mocha", "hex": "#B96E67" }` or another explicitly documented normalized form. Selection from a scene resolves to the product first, then a selected/default variant.
3. Inventory in fixtures is **demo stock only**; seed a safe nonzero fake count and mark the site demo. Real provider inventory requires import and reconciliation before checkout.
4. `Product` and `ProductVariant` states are independent. A discontinued variant must not be purchasable even if its product is published.
5. Every price, tax, shipping and discount amount is checked for nonnegative safe integers. Avoid floating point currency arithmetic and mixed-currency carts.
6. `CartItem` has `(cartId, variantId)` unique. Unauthenticated guest carts stay in the browser unless a specific guest server session design is approved. Upon login, merge line quantities with a cap and explicit conflict handling.
7. Future order creation must occur inside one database transaction: reprice item snapshots from current database rows, validate inventory, reserve inventory, create pending order, and create idempotent payment intent via selected provider. **Do not implement this flow until payments/shipping rules are approved.**

## Scene coordinate and cosmetic configuration contracts

- `Scene.imageWidth`, `imageHeight`: natural image dimensions.
- `Hotspot.rect`: JSON tuple `[x, y, width, height]` with finite numbers; x/y ≥0; positive width/height; no overflow beyond natural dimensions. `priority` controls click ordering; when overlapping, the UI must allow picking each object by keyboard/product list.
- `SavedLookItem.configuration`: e.g. `{ "slot": "lips", "shadeId": "soft-mocha", "intensity": 0.55, "finish": "satin" }`; validate the keys and values server side and refuse raw image/pixel payloads.
- Do not persist user-supplied camera frames or selfies; there is **no facial-image table**.

## Migration/seed handoff to Codex

1. Install/verify Prisma and PostgreSQL version compatibility. Set local `DATABASE_URL` in a private `.env`; use config example. Run `prisma validate`, `prisma migrate dev --name init_fairy` against the **user-confirmed development DB only**.
2. Write `prisma/seed.ts` to upsert by product ID/SKU, scene slug and `(sceneId, productId)` hotspot key from all provided JSON files. Seed product images, default variants, known shades, demo stock, and preserve the exact source asset URLs. Record a seed fingerprint/count; on rerun do not duplicate records.
3. Never seed an admin password from a public sample. Bootstrap the **first admin** with a private, audited one-time promotion command that verifies user identity and requires explicit operator invocation.
4. Add integrity tests: 23 products, 2 scenes, all hotspot refs valid, image coordinate bounds, unique SKU/slug, variant stock nonnegative, ownership isolation and prevented role elevation.
5. Create separate test database, migration rollback strategy and backup policy **before any production DB deployment**. Use `prisma migrate deploy` only in controlled deployment after review.

## Why this is an architecture plan, not a live database

No running PostgreSQL server, migration SQL, seed output, real stock or payment credential is included. The Prisma schema is a concrete scaffold. Codex must run its generator and review migration diffs. Nonfictional demo data and real inventory must remain clearly separated.
