# 12 — Authentication, administration, security and privacy

This file specifies **required behaviors**, not pre-existing live accounts or secrets. Use Auth.js with the official Prisma adapter, the corresponding models in `prisma/schema.prisma`, and server-only session validation. The choice of OAuth/email providers is **still undecided**; do not invent provider credentials. For development, establish a documented local-only test identity strategy that cannot silently reach production.

## Role and permission matrix

| Capability | Anonymous | CUSTOMER | STAFF | ADMIN |
|---|---:|---:|---:|---:|
| Browse published products/scenes | Yes | Yes | Yes | Yes |
| Local demo bag/2D studio | Yes | Yes | Yes | Yes |
| Persist own cart/wishlist/looks | No | Yes | Yes | Yes |
| Read own account/addresses | No | Yes | Yes | Yes |
| View admin catalog/inventory | No | No | Yes | Yes |
| Edit products, prices, scenes, stock | No | No | No by default | Yes |
| View redacted audit log | No | No | No | Yes |
| Manage staff/admin roles | No | No | No | **Operator-only controlled procedure** |
| Capture real payment | No | No | No | **Disabled for all** |

Never trust `role` in JWT claims beyond current server-validated identity without a safe invalidation policy. Read the persisted user's current role for sensitive admin operations, or use short-lived server sessions with immediate revocation on demotion.

## Auth lifecycle

1. Render sign-in/sign-out/account entry points using supplied visuals. Do not create anonymous accounts silently.
2. Auth.js owns auth callbacks, CSRF handling and session cookies; use secure, HTTP-only cookies in deployment. Configure provider(s) only after owner's choice and environment values are available.
3. Persist identity with `User`, `Account`, `Session`, `VerificationToken` through Prisma adapter; seed **no public admin credentials**. Disallow client role changes and never expose account tokens in API DTOs.
4. Newly created users receive `CUSTOMER`. The initial administrator is promoted through a one-time private operator command after identity verification, with a timestamped `AuditLog`. No `ADMIN=true` client flag or public `/setup-admin` endpoint.
5. Login merges permitted guest demo cart items only after validation/stock checks. User logout clears sensitive in-memory state, preview object URLs and local camera tracks.

## Admin user experience

- Dashboard uses FAIRY dark espresso shell, warm-pearl tables, champagne highlights; inherits fonts, tokens and spacing of public site.
- Product editor: slug, SKU, name, category, description, publish state, variants, price minor units/currency, image gallery/alt text, visible try-on slot.
- Scene editor: select scene image, preview its native dimensions, drag/tune hotspots with product references and keyboard-friendly list editor. Save validates hotspots within bounds and preserves original image.
- Inventory editor: show on-hand/reserved counts and timestamp; record reason and actor for changes. Refuse negative balances.
- Orders/payments: show **demo / not configured** state only until actual payment/shipping scope is approved. Never show fabricated completed orders.
- Every protected mutation creates an `AuditLog` with actor ID, operation, target, timestamp, a minimal change summary and request correlation ID (if available); avoid storing secrets/PII in log `details`.

## Security checklist before any deployment

- [ ] Zod parse/validate all route params, query strings and request bodies. Bound lengths/counts, sanitize file paths, whitelist sorting.
- [ ] Server session + database role required on protected operations. Ownership checks for carts/looks/addresses, not just UI hiding.
- [ ] Auth.js CSRF/session protections configured; same-origin mutations and appropriate cookies. Rate-limit sign-in, search, uploads and admin writes.
- [ ] No SQL string interpolation: use Prisma parameters/queries. Do not expose raw SQL/Prisma error messages.
- [ ] Database row ownership, unique constraints, status checks and transaction boundaries enforced. Read current DB price/inventory in server computations.
- [ ] Restrict image uploads to trusted MIME/content/signature/size. Use licensed assets and safe storage with private ACLs when enabled; never serve arbitrary local file paths.
- [ ] No API secrets in `NEXT_PUBLIC_*`, source code, screenshots, browser storage or git. Keep `.env` ignored; rotate any leaked key.
- [ ] Safe HTML rendering; no untrusted `dangerouslySetInnerHTML`, sanitize user-generated descriptions if rich text is ever supported. Apply suitable CSP/security headers.
- [ ] Structured error handling, audit retention, monitoring and backups reviewed for production; test DB isolated from real records.
- [ ] Real checkout, refunds, shipping, taxes, legal policy and fulfillment remain **disabled** until vendor and owner policies are established.

## Camera/selfie privacy is an explicit product feature

- Initial studio = FAIRY-supplied neutral model photo plus local simulated color masks, not biometric recognition or clinical shade matching.
- Camera/selfie mode must be **off by default**; show a clear explanation and ask permission with deliberate user action. No hidden capture.
- Process pixels locally where practical. Do **not** upload, retain, track or train on face photos. The schema includes no face image persistence. Revoke tracks/object URLs on exit/reset.
- Supply a full non-camera alternative. A photograph alone does not guarantee foundation shade, skin compatibility or real-world makeup appearance.
- Before any real facial processing or production deployment, obtain owner-approved terms/privacy policy, retention statement, age considerations and local legal review.

## Go/no-go checks

The team may consider the architecture implementation complete when: Prisma migrations apply to a fresh development DB, fixture seed is idempotent, login/session works with an explicitly configured development provider, all admin route tests confirm role/ownership checks, mutation audit logs persist, cart/looks/scene APIs pass typed tests, and screenshot parity of the four reference screens still holds. **Do not equate this with a live production launch.**
