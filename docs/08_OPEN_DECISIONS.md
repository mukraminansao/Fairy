# 08 — Owner decisions and known fidelity gaps

This is a **decision log**. It prevents Codex from inventing production business rules, hiding missing 3D assets, or asserting that screenshot-derived values are exact.

## Locked decisions

- Final product/brand name: **FAIRY**.
- Aesthetic: elegant couture/beauty editorial, not fantasy, cartoon or playful.
- Theme: dark espresso announcement/nav/hero, pearl shopping and studio panels, matte champagne accent.
- Four approved Fairy reference screens at 1672×941.
- Original streetwear reference must remain a directly clickable image on the fashion shoppable page.
- Makeup flat-lay objects are clickable directly and transition into a virtual face studio.
- Page layout, photo composition and typography should be iterated against screenshots, not approximated once.
- Full-stack implementation: **Next.js App Router, React, TypeScript, CSS Modules + token variables, PostgreSQL, Prisma ORM, Auth.js + Prisma adapter, Playwright**. Server code lives in the same Next.js application; API and data contracts are defined in docs 09–12.

## Decisions intentionally deferred

| Topic | Placeholder for visual prototype | Decision required before production |
|---|---|---|
| Currency | USD to match reference screenshots | PHP, USD or multi-currency; rounding and conversion rules |
| Prices/inventory | Fixture catalog, `demoOnly: true` | Actual supplier SKU/prices/stock |
| Product branding | Fairy-owned sample cosmetics + user-supplied fashion photo | Genuine suppliers, rights to photographs/trademarks and products |
| Fonts | Bodoni Moda + Manrope candidate | Confirm actual/licensed brand fonts after parity comparisons |
| Payment | No live charges; explicit demo checkout | Provider, country, fees, settlements, refunds |
| Shipping/tax | Non-live | Rules, regions, couriers, returns, taxes |
| Accounts | Auth.js identity + customer/admin roles and server-side access checks; guest may use non-sensitive local demo cart | Allowed sign-in providers, guest checkout, email verification policy, production user notices |
| Face studio | Catalog model + simulated local color overlays | Camera/selfie policy, real face landmarks, calibration, consent and retention |
| Fashion preview | Front-view transparent PNG + honest 2D outfit builder | Licensed rigged avatar, each garment mesh, sizing/fit alignment, true orbit |
| Responsive | Inferred mobile/tablet patterns | Owner review of generated responsive designs |

## Explicit limitations

- Font family and CSS spacing cannot be recovered with certainty from flattened screenshots. The detailed CSS numbers are approximate. Visual comparison can close the gap but not prove 100% exactness.
- Some standalone photographs were regenerated independently of the screenshots. They match the art direction and main items but are not identical pixel-for-pixel to the photos baked into original references.
- There is no supplied production database, payment account, remote storage, full catalog, 3D model inventory or face-tracking model weight package.
- No product/medical claims or fit accuracy guarantees should be made by the application.

## Recommended owner signoff sequence

1. Check actual screenshot parity of homepage.
2. Check original fashion flat-lay fidelity and direct item clicks.
3. Check beauty flat-lay and product shade selection.
4. Check large-face studio and before/after result.
5. Approve actual mobile/tablet proposals.
6. Review database/admin workflows and choose checkout/shipping/production integrations (core backend stack is already fixed).
7. Decide real garment model assets and camera privacy before advertising true AR or 3D functionality.
