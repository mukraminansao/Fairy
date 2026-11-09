# 01 — FAIRY master implementation plan

## Product vision

FAIRY is a premium marketplace for fashion, makeup, skincare, jewelry, accessories, and fragrance. Its signature interaction is **shopping directly from a composed image**. A customer points at a real item in a flat-lay or curated product scene, opens its detail without losing context, and optionally previews it in a fitting room or makeup studio. The rest of the store must feel like a polished, conventional e-commerce site.

**Approved visual direction:** hybrid dark espresso homepage/header and warm-pearl browsing and try-on interiors, muted champagne highlights, elegant editorial serif typography, refined realistic photography, FAIRY luxury wordmark. Never fantasy visuals.

## Scope and staged milestones

| Phase | Objective | Required work | Evidence of completion |
|---|---|---|---|
| 0 | Asset audit & setup | Inspect all references, verify asset sizes and brand consistency; initialize the **locked stack** and shared tokens | Asset map, Next.js boots, fonts load, lockfile committed |
| 1 | Screenshot-parity homepage | Build announcement, nav, dark editorial hero, category cards, instructional strip, search and cart actions | Screenshot at 1672×941 versus `01` reference, responsive navigation |
| 2 | Shoppable fashion | Exact original image; object-level hotspots; hover, keyboard and tap; select pendant, macro zoom, data-driven side panel, add/look state | Screenshot versus `02`, 12 product interaction tests |
| 3 | Shoppable beauty | Fairy makeup photograph; product hotspots; selected lipstick, shade options, open studio | Screenshot versus `03`, 9 product interaction tests |
| 4 | Virtual Beauty Studio MVP | Face model, bag, product layers, shades, intensity, finish, before/after slider, save/reset, cart | Screenshot versus `04`, deterministic visual and functional tests |
| 5 | Fashion fitting-room MVP | Honest 2D mannequin staging, slot selection, outfit composition state, save outfit | Working 2D preview; **no false 3D claim** |
| 6 | Catalog and storefront flows | Category listings, product pages, cart, wishlist, search, account UI, filters, stock/variant contracts | Accessibility, unit/e2e tests, fixture-driven operation |
| 7 | Backend and controlled commerce | PostgreSQL/Prisma schema+migrations+seed, Auth.js, products/scenes/cart/wishlist/looks, stock checks, admin product tools, audit logs, typed APIs, demo checkout | Migration+API+permission tests; real payment/shipping still gated by owner choices |
| 8 | True 3D & camera AR | Rigged model/clothing assets and animation; camera face landmarks; overlay calibration and privacy | Real tested rotation, garment swaps and calibrated makeup preview; separate signoff |

**Mandatory delivery discipline:** complete phases 1–4 in this order; stop for review after each target. Avoid attempting all features in one giant code generation pass.

## Locked technology and frontend approach

- **Next.js App Router + React + TypeScript** for the entire app. Use Next.js server components where suitable, client components for hotspots/studio, route handlers for APIs and server-side services for business logic.
- **PostgreSQL with Prisma ORM** for real catalog, users, shopping states and admin records; **Auth.js + Prisma adapter** for sign-in/session management. These are no longer owner choices.
- **CSS Modules and custom CSS variables** (not a generic component library or a Tailwind-first redesign). Use supplied token values and screenshot comparisons.
- Component boundaries: `AnnouncementBar`, `HeaderNav`, `HeroCampaign`, `CategoryStrip`, `ImageHotspotScene`, `ProductZoomCard`, `ProductDetails`, `OutfitSummary`, `BeautyStudioCanvas`, `BeautyBag`, `ShadePanel`, `CartDrawer`, `Toast`, `ResponsiveNav`.
- Use typed scene IDs/product IDs and data-driven rendering. Never hard-code every clickable object in its own JSX file.
- Central states for current scene, selected item, shade, try-on look, product list, cart, wishlist, zoom, and overlay/drawer. Make navigation serializable in URL when appropriate.
- Use semantic button elements overlaying scene images via SVG, or accessible transparent controls mapped to the same viewBox. Ensure they are all keyboard-focusable and announced to screen readers.
- Dynamic styling/animation should preserve accessibility and `prefers-reduced-motion`.
- Use deterministic local fixtures from `data/` for initial visual gates, then seed identical IDs/content into PostgreSQL and switch to typed Prisma-backed repositories at Gate 5; never require a database to see the first screenshot.
- Use Playwright screenshot and e2e tests, plus TypeScript unit tests for pure cart/scene math. Read `docs/09_LOCKED_TECH_STACK.md` and the database/API/security specs in `docs/10..12`.

## Non-negotiable user flows

1. Home → Shop the Look → select actual necklace region → macro pendant → add to look → open fitting room.
2. Home → Makeup/curated look → select actual lipstick in photo → lipstick macro/shades → open virtual makeup studio.
3. Studio → apply lipstick + blush + foundation + eyeshadow; adjust shade/intensity; before/after; save look; add actual selected items to cart.
4. Header categories → relevant browsing/listings, actual product detail pages, search and cart interactions.
5. Phone/touch usage → same flows without relying on hover; zoom viewer and editing panels remain accessible.

## Honest implementation of advanced technology

- A transparent mannequin PNG is **not a 3D rigged mesh**. A full real-world 360° fitting room needs a `.glb/.gltf` body model, separate fitted clothing meshes, materials, morph targets/rigging, sizes, alignment, and rotation controls. If those are unavailable, produce a well-labeled **2D look preview** and a clearly documented real-3D integration plan. Never show a fake 360 label as if functional.
- A face photo with color overlays is **not calibrated AR**. Begin with a 2D simulated preview and correct blend masks for lip/cheek/eye areas. For optional camera/selfie mode, use face landmark tracking and explicitly get camera permission; calibrate with device lighting and skin tone, and disclose that actual product shades may vary.
- Do not persist/transfer selfie images without informed consent and a privacy plan. For demo, process locally and discard on exit.
- Checkout is not production-ready until payment gateway, country/currency, shipping, taxes, product rights, identity and admin roles are decided. Use a clearly labeled demo checkout in earlier milestones.

## Owner decisions still needed before production

- Currency (prototype references use USD), actual product prices, inventory, categories/brands, shipping territory and fulfillment.
- Payment provider and region, tax rules, returns policy, fraud checks, and data retention.
- Users: guest checkout vs mandatory accounts; social sign-in; admin staff permissions.
- Ownership/license to use the original reference flat-lay and any real-world trademarked products as commercial catalog imagery.
- Whether beauty try-on uses a catalog model, selfie, live camera, or all three; processing privacy/consent.
- Budget and source for rigged avatar + fitted garment GLB files; device performance target.

## General completion checklist

- All four approved pages pass visual review, use real supplied images and FAIRY branding.
- Every visible interaction is functional or transparently marked unavailable.
- Responsive layouts, focus/keyboard, image alt text, contrast, reduced motion, form errors, and loading states.
- Product quantities, variants, and cart totals are correct; UI updates persist for the prototype.
- No earlier working-name strings in generated application or assets; no screenshot-as-background hacks.
- README documents how to run, test, and continue production integration.
