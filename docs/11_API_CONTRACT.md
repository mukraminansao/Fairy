# 11 — Typed API contracts for the Next.js backend

All application endpoints are same-origin Next.js App Router route handlers under `/api/v1`. Return JSON, status codes and stable errors. Auth.js owns `/api/auth/*` separately. Public reads may also use Server Components/server services directly; API routes exist for interactions requiring requests from Client Components.

## JSON envelopes and error semantics

Success: `{ "data": ..., "meta": { ... } }`. Failure: `{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable summary", "fields": {} } }`. Never return raw Prisma/SQL errors, access tokens, a password/hash or server stack traces.

| Status | Use |
|---|---|
| `200` / `201` | Read / newly created resource (with sanitized DTO) |
| `204` | Successful deletion with no response body |
| `400` / `422` | Invalid JSON / syntactically valid but semantically invalid values |
| `401` | Session required but missing |
| `403` | Logged in but unauthorized role/resource |
| `404` | Resource hidden, absent or not visible to requesting user |
| `409` | Duplicate SKU, insufficient stock, conflicting update or duplicate idempotency key |
| `429` | Rate limit exceeded |
| `500` | Generic internal failure; log trace privately |

All mutation handlers must enforce same-origin/CSRF strategy appropriate to Auth.js and use Zod validation. Pagination queries: `cursor` optional and `limit` bounded (default 20, max 50). Filter/sort fields use allowlists, never raw SQL input. Non-admin reads expose only published/active objects.

## Public catalog and scenes

| Method and path | Input | Result |
|---|---|---|
| `GET /api/v1/products` | `category?`, `q?`, `cursor?`, `limit?`, `sort?` | Products with active variants and page cursor; sanitize stock display |
| `GET /api/v1/products/[slug]` | URL slug | Product, images, public active variants, trial capabilities |
| `GET /api/v1/categories` | None | Category slugs and counts |
| `GET /api/v1/scenes` | `kind?`, pagination | Published scene cards |
| `GET /api/v1/scenes/[slug]` | URL slug | Original scene image path, natural dimensions, hotspots, product summaries |

The interactive scene response preserves the supplied original pixel geometry:

```json
{
  "data": {
    "id": "monochrome-street",
    "image": "/assets/original/streetwear_flatlay_user.jpg",
    "imageSize": [736, 1308],
    "hotspots": [
      { "productId": "f-pendant", "rect": [597, 483, 91, 177], "priority": 9 }
    ]
  }
}
```

Do not replace original scene photography with a grid or bake hotspots into the image. A client sets `viewBox="0 0 736 1308"` and maps selection coordinates to the natural image dimensions.

## Session-owned commerce and looks

| Method and path | Input | Result / policy |
|---|---|---|
| `GET /api/v1/me` | Auth.js session | Public profile, safe role, name/email; no tokens |
| `GET /api/v1/cart` | Session | Current user's cart lines plus **server-computed** totals |
| `PUT /api/v1/cart/items/[variantId]` | `{ "quantity": 1 }` | Upsert bounded quantity 1–20; resolve user/cart server side; compute price from DB |
| `DELETE /api/v1/cart/items/[variantId]` | None | Remove owned line; `204` |
| `GET /api/v1/wishlist` | Session | Product summaries saved by the user |
| `PUT /api/v1/wishlist/[productId]` | None | Add product for current user; idempotent |
| `DELETE /api/v1/wishlist/[productId]` | None | Remove product for current user; idempotent |
| `GET /api/v1/looks` | Session, pagination | Owned saved looks only |
| `POST /api/v1/looks` | `{ "name", "kind", "items": [{ "variantId", "configuration" }] }` | `201` stored owned look; no selfie media |
| `PATCH /api/v1/looks/[id]` | Name/items | Update owned look; server checks all variants |
| `DELETE /api/v1/looks/[id]` | None | Delete only own look; `204` |

For sample-model contour products, `configuration.contourSketch` can store a blend value (0–100) and up to 24 strokes. Each stroke contains a brush size (3–16) and up to 160 pairs of normalized integer coordinates (0–1000). Personal-photo strokes remain in memory and are not sent with a look. Legacy contour zone settings are still accepted for existing looks.

If Auth.js session is absent, the early prototype may keep a **clearly labeled local-only demo cart**, but protected API calls return `401`. Do not trust a `userId`, `role`, `price`, `currency`, `stock` or `isPaid` field from a client request. Server sets ownership, derives totals and filters allowed mutations.

### Example cart update

Request `PUT /api/v1/cart/items/variant-f-pendant-default`:

```json
{ "quantity": 2 }
```

Response illustrative only (not live inventory):

```json
{
  "data": {
    "items": [{ "variantId": "variant-f-pendant-default", "quantity": 2, "unitPriceMinor": 4800, "currency": "USD", "lineTotalMinor": 9600 }],
    "subtotalMinor": 9600,
    "currency": "USD",
    "isDemo": true
  }
}
```

## Protected admin API

| Method and path | Scope | Audit obligation |
|---|---|---|
| `GET /api/v1/admin/products` | STAFF or ADMIN | Read is permission checked |
| `POST /api/v1/admin/products` | ADMIN or catalog-editor permission | Record product-created event |
| `PATCH /api/v1/admin/products/[id]` | ADMIN or catalog-editor permission | Store changed-field summary |
| `POST /api/v1/admin/products/[id]/variants` | ADMIN or catalog-editor permission | Record variant creation |
| `PATCH /api/v1/admin/variants/[id]` | ADMIN or catalog-editor permission | Record price/status change |
| `PATCH /api/v1/admin/inventory/[variantId]` | ADMIN or inventory-editor permission | Record old/new stock count and actor |
| `PATCH /api/v1/admin/scenes/[id]` | ADMIN or scene-editor permission | Validate image-space hotspot geometry, record change |
| `GET /api/v1/admin/audit` | ADMIN only | Paginated redacted audit records |

Until finer granular permissions are built, default to **ADMIN for writes and STAFF read-only**. No roles may be assigned through a public endpoint. All admin pages and endpoints independently check the server session and database role. Use soft-archive or status transitions when referenced records must remain visible in order history.

## Checkout remains explicitly disabled

- `/checkout` displays the assembled cart and a **Demo — no payment will be taken** notice. It must not claim an order was placed.
- No `/api/v1/checkout/charge`, live order creation, payment webhook or card storage is authorized by this kit.
- When owner selects payment, shipping, currency and region, write a separate versioned provider spec including webhook signature verification, idempotency, order reservation/release and refunds, then request signoff.

## Required endpoint tests

- Public list/product/scene success and invalid slug; route outputs and hotspot geometry match fixtures.
- `401` unauthenticated cart/looks/admin mutation; `403` customer trying admin; `404` cross-user look/cart access.
- Invalid quantity, invalid variant/shade, stale/archived product, duplicate SKU, too-large payload and malformed coordinates rejected.
- Cart arithmetic, price recalculation on changed DB price, currency mismatch rejection, idempotent wishlist/cart update.
- Admin mutation creates audit record; no role escalation or userId spoofing through request JSON.
