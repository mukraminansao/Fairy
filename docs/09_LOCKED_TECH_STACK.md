# 09 — Locked technology stack and implementation rules

**Decision status: LOCKED for FAIRY.** A change requires an explicit owner decision; do not substitute technologies merely because a generic template exists. The versions below are deliberately expressed as **compatible, pinned project versions to be selected/verified by Codex at implementation time**, not unfounded claims about the latest versions.

| Layer | FAIRY decision | Non-negotiable implementation detail |
|---|---|---|
| Language | TypeScript (strict) | Frontend, API, service/domain logic, tests, and seed program |
| Frontend | Next.js App Router + React | File routes under `src/app`; Server Components by default; client islands for interactions |
| Design | CSS Modules + global CSS variables | Brand token JSON maps to `tokens.css`; no generic visual redesign or UI template takeover |
| Fonts | Bodoni Moda + Manrope *initial candidate* | Load explicitly; screenshot-check and tune weights/metrics; owner may license final fonts |
| Backend | Next.js Route Handlers + server-only services | Same-origin `/api/v1`; no separate Express/Nest service required for initial release |
| Database | PostgreSQL | Relational source of truth, migrations, indexes, transactions |
| ORM | Prisma ORM | Schema at `prisma/schema.prisma`, generated typed client, migrator and upsert seed |
| Database connectivity | Prisma PostgreSQL driver adapter | Confirm compatibility with installed Prisma major; keep `DATABASE_URL` server-only |
| Authentication | Auth.js with official Prisma adapter | Server-managed identity/session; roles enforced inside protected server handlers |
| Request validation | Zod | Body, query and route params validated before service methods |
| Unit/integration testing | Vitest or framework-compatible TS test runner | Money calculations, hotspot geometry, model validation, authorization and services |
| Browser visual/e2e | Playwright | Desktop screenshot 1672×941 and mobile 390px; no brittle arbitrary timeouts |
| 2D beauty MVP | React state + Canvas/SVG overlays | Simulated effect on supplied local face; honest labels and deterministic compositing |
| Future face AR | MediaPipe Face Landmarker for Web | Only after explicit consent/privacy and real-device validation |
| Future 3D fitting | Three.js + glTF/GLB asset pipeline | Only with licensed rigged avatar, fitted garment meshes and tested controls |
| Asset serving | Local `public/assets` initially | Production storage/CDN vendor deferred; preserve path stability |
| Hosting and payments | **Not selected** | No invented provider accounts, charging, webhooks or claims of live checkout |

## Dependency setup contract

1. Use the user's existing Node.js 24 if supported by the chosen compatible Next.js/Prisma release; check official engine ranges before installing. A supported LTS Node runtime can be used if compatibility requires it.
2. Initialize Next.js App Router with TypeScript, ESLint, `src/` directory, import alias (`@/*`) and **no Tailwind UI scaffold**. Retain an npm lockfile (`package-lock.json`) and commit it. Do not hardcode guessed future package versions in this plan.
3. Add Prisma/PostgreSQL dependencies, a driver adapter compatible with the installed Prisma release, Auth.js and its Prisma adapter, Zod, Playwright, and a TS test runner. Configure `tsconfig.json` strict and linting.
4. Use `prisma.config.ts` with `DATABASE_URL` (Prisma versions requiring config rather than a URL in `schema.prisma`), generate the Prisma client to `src/generated/prisma`, run migration against a **local/test database**, and seed the demo fixtures. Never assume a live production DB is available.
5. Place `DATABASE_URL` and `AUTH_SECRET` only in server-side environment. Add no live credentials to git. `NEXT_PUBLIC_*` must contain only intentionally public values.
6. Start Gate 1 **without database dependence** using fixtures, then implement the database-backed adapter in Gate 5, keeping rendered output visually equivalent.

## Required runtime boundaries

- The database client module imports `server-only`; server components can fetch via repositories; client components receive **serializable sanitized DTOs**, not Prisma objects or secret fields.
- Route handlers validate requests, consult the Auth.js session and server role, then call services. Admin rights are checked on **every mutation**, not just via a protected nav/sidebar.
- Keep stable IDs for clickable hotspots, `data/catalog.json` and `data/scenes.json`, because the design depends on those mappings.
- Cart totals always compute from database variant prices using integer minor units; ignore submitted prices; recheck live stock in a transaction before any future order reservation.
- High-performance canvas, mesh and landmark work loads in client-only code and degrades to provided 2D screenshots/assets. Respect reduced motion.
- Browser storage may hold non-sensitive guest demo cart/preview state; never put credentials, selfie pixels, admin tokens or payment data there.

## Deliverable commands Codex must make runnable

These are expected command **interfaces** after project creation (not claims they work in this handoff ZIP):

```sh
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npx prisma validate
npx prisma migrate dev
npx prisma db seed
```

Add an unambiguous README explaining required local PostgreSQL setup, safe environment variable creation and starting the site. Do not perform database migration or seeding on an existing unverified user database.

Official starting references: [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation), [Prisma PostgreSQL](https://www.prisma.io/docs/orm/overview/databases/postgresql), [Prisma config](https://www.prisma.io/docs/orm/reference/prisma-config-reference), [Auth.js Prisma adapter](https://authjs.dev/getting-started/adapters/prisma), [Playwright snapshots](https://playwright.dev/docs/test-snapshots).
