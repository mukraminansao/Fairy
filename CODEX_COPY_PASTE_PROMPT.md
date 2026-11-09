# Paste this entire instruction into Codex

You are implementing **FAIRY**, a premium beauty + fashion e-commerce experience. This directory contains the authoritative handoff kit. Do not use any prior working brand name.

**Your priority is visual fidelity and functional honesty.** Before touching code, read `AGENTS.md`, `00_READ_ME_FIRST.md`, **all documents in `docs/` including 09–12**, `stack/fairy-stack.json`, `prisma/schema.prisma`, `.env.example`, `prisma.config.ts.example`, `tokens/fairy-tokens.json`, and **all JSON files in `data/`**. Inspect **all four** target screenshots in `assets/references/` and the standalone assets in `assets/images/`. Summarize your understanding in 10 concise bullets, including any missing dependencies. The stack is **non-negotiable**: Next.js App Router, React, TypeScript, CSS Modules + CSS variables, PostgreSQL, Prisma, Auth.js/Prisma adapter, Playwright. Do not silently use Vite, PHP, MySQL, SQLite or Firebase in their place.

## Build order: do not skip gates

1. **Gate 1: homepage.** Create the shared shell, exact Fairy brand, dark header and hero, product still life, CTA buttons, ivory category cards, bottom step bar. Compare a rendered screenshot at **1672×941** with `01_fairy_homepage.png`; iterate until visual layout is convincingly close. Do not proceed until the visual gate and navigation are working.
2. **Gate 2: fashion scene.** Use the original flat-lay image from `assets/original/` and actual clickable SVG regions from `data/scenes.json`, with hover/focus selection and product detail zoom. Match `02_fairy_fashion_shoppable.png`. Connect the button to a fashion fitting-room route. For the supplied front-view mannequin PNG, state honestly that this is 2D; do not fake 360-degree orbit.
3. **Gate 3: makeup scene.** Use `makeup_flatlay_fairy.png` with clickable per-object regions, selected lipstick macro, shade options, and working navigation to the Beauty Studio. Match `03_fairy_makeup_shoppable.png`.
4. **Gate 4: Beauty Studio.** Match `04_fairy_virtual_beauty_studio.png`: left selection bag, large central neutral model face, before/after compare, right product and shade panel, functional shade selection and intensity/finish, save/reset, bag total. Implement a clearly labeled **simulated preview** on the supplied neutral face first. Do not claim clinically accurate matching. Selfie/camera only after implementing consent, local processing, permission, disposal, fallback and testing.
5. **Gate 5: real backend, auth, and demo commerce.** Set up PostgreSQL + Prisma from `prisma/schema.prisma`; provide migrations, fixture-based idempotent seed, server repositories, typed route handlers and validation. Add Auth.js with Prisma adapter and server-side role authorization. Implement product/category/scene reads; account carts, wishlists and saved looks; protected admin CRUD and audit logging. Unit + API + Playwright e2e tests must cover authorized and unauthorized paths. Demo checkout must never charge, decrement inventory or invent an order confirmation. Read `docs/10_DATABASE_SCHEMA.md`, `docs/11_API_CONTRACT.md`, `docs/12_AUTH_ADMIN_SECURITY.md`.
6. **Gate 6: real 3D/AR integrations** only after the necessary licensed 3D garment meshes, fitting rules, and face tracking requirements are agreed. Do not merely animate a static PNG as a fake 3D rotation. Use the Three.js and MediaPipe integration boundaries in `docs/09_LOCKED_TECH_STACK.md`.

## Fidelity requirements

- Every visible UI item must correspond to the reference: **font face/weight, font sizes, line heights, tracking, shadows, radii, borders, color tokens, top spacing, and image crop**. Do not substitute generic cards, fake gradient blobs, stock photos, or arbitrary icon fonts.
- Lock the default browser baseline: CSS reset, `box-sizing: border-box`, explicit font loading, consistent line-height, no default margins. Use `tokens/fairy-tokens.json` as your starting point; tweak values only after screenshot comparison.
- Never display an image of the entire reference as the UI. All website copy and controls must be semantic, accessible, real DOM elements. Only photographic regions use image files.
- The brand must be **FAIRY** in logo, search placeholder, metadata, products, and app identity.
- Responsiveness: make thoughtful layouts at 1440px desktop, 768px tablet and 390px mobile; don't assume the desktop screenshot itself is mobile design.
- Interactions must support mouse, touch and keyboard; hover is not the only selection method.
- Do not ask me to accept 'close enough' after one attempt. Use a measured screenshot overlay/diff loop, fix the largest discrepancies, and show me changed screenshots. Be honest about any mismatch caused by inferred fonts or product photos.

## Deliverables per gate

1. Working app code and local run commands.
2. Target screenshot and actual screenshot compared at 1672×941; a diff/overlay file or side-by-side.
3. Short parity report: geometry, typography, photography, color, behavior, accessibility, residual discrepancies.
4. Functional tests, not just screenshots.
5. Clear declaration of what is implemented, mocked, or blocked.

Use official technical documentation linked in `docs/07_ARCHITECTURE_AND_DATA.md` for camera permission, face landmarks, 3D files, and visual testing. Keep dependency versions compatible with the actual chosen project runtime. Start with **Gate 1**, and show me the first screenshot and parity report before advancing.

When Gate 5 begins, also deliver: the SQL migration history, reproducible seed commands, `.env.example` only (never secrets), route/API test results, account/admin permission matrix, and a database diagram or clear relation summary. Record all unresolved production decisions from `docs/08_OPEN_DECISIONS.md` instead of inventing live payment and shipping behavior.
