# FAIRY — Codex implementation handoff

**Final brand: FAIRY.** All earlier working names are retired. This pack reflects the approved **hybrid dark-luxury homepage + light shopping/try-on pages** design.

## What is in this ZIP

- `assets/references/01..04`: four **FAIRY-branded approved visual targets**, 1672×941 pixels each.
- `assets/images/`: eight standalone, usable photographs / illustrative preview assets rather than screenshots with baked UI.
- `assets/original/streetwear_flatlay_user.jpg`: the user's original 736×1308 clickable fashion scene. **Preserve this image** in the shopping page.
- `assets/brand/fairy-wordmark.svg`: fallback wordmark; a typeset HTML logo is preferred if it matches the screenshot more closely.
- `tokens/fairy-tokens.json`: measured/inferred shared design tokens.
- `data/catalog.json`: demonstration products and sample prices (NOT real inventory).
- `data/scenes.json`: starter interactive regions for clicking physical objects in the two scenes.
- `data/look-presets.json`, `data/face-regions.json`: starting outfit/makeup states and rough face-overlay locations.
- `docs/`: implementation, typography, per-screen pixel hints, interactions, architecture, and QA.
- `docs/09..12`: **locked full-stack choices**, relational database design, typed API contracts, authentication, admin and security requirements.
- `prisma/schema.prisma`: starting PostgreSQL/Prisma schema; `prisma.config.ts.example` and `.env.example` demonstrate safe configuration without credentials.
- `stack/fairy-stack.json`: machine-readable architectural decisions for Codex to follow.
- `AGENTS.md`: strict repo instructions recognized by coding agents when located within their working tree.
- `CODEX_COPY_PASTE_PROMPT.md`: the ready-to-send instruction for Codex.
- `scripts/compare_screens.py`: optional visual comparison helper.

## How to use this with Codex

1. Unzip `FAIRY_Codex_Build_Kit.zip` without changing the internal paths.
2. Open **the extracted `FAIRY_Codex_Build_Kit` directory itself** as the Codex project, or copy the kit contents into the root of your own repository so `AGENTS.md` is at the project root.
3. Attach/provide `CODEX_COPY_PASTE_PROMPT.md` as the initial instruction, and tell Codex to read the local files (not just this chat message).
4. Ask Codex to complete **visual gate 1 (homepage)** first and show you a browser screenshot at **1672×941**. Approve it or request corrections before moving to the next screen. This prevents cheap one-pass approximations.
5. Have Codex repeat the visual comparison for fashion, makeup, and beauty studio, then build the **specified** Next.js/TypeScript/PostgreSQL/Prisma backend in the staged order below.
6. Do not publish or connect payments until you have decided checkout provider, currency, shipping rules, privacy policy, and real inventory.

## Important reality check

The reference screens were generated as images, not exported from a source Figma design. Raster images **cannot prove original CSS pixels, font files, vector details, or hidden responsive layouts**. The specifications are highly detailed **approximations with testable targets**, not a mathematical guarantee of 100% pixel identity. Correct implementation requires browser screenshots, side-by-side overlays, iteration, and your approval.

The provided mannequin is a transparent **2D front-view PNG**, not a `.glb` 3D model. The neutral face is a **photo**, not a working AR engine. They are appropriate for faithful visual staging and a truthful 2D demo. Real rotation, garment fit, facial landmark tracking, and accurate cosmetic rendering have independent technical/asset requirements described in the plan.

The programming stack and database model are now selected; this **kit is a specification and assets package, not an installed Next.js application or migrated database**. Codex must create the source app, install compatible pinned dependencies, generate migrations, seed demo records and test its API. See `docs/09_LOCKED_TECH_STACK.md` through `docs/12_AUTH_ADMIN_SECURITY.md`.

## Screenshot authority and asset authority

- Use `assets/references/` to judge **layout, spacing, typography appearance, color, and copy**.
- Use `assets/images/` and `assets/original/` as **actual DOM image content**.
- Never put an entire reference screenshot behind invisible click areas and call it an implementation. The text, navbar, buttons, forms, and responsive layout must be real HTML/CSS/components.
- Reconstruct product photography using supplied standalone assets; slight scene differences are expected. Do not promise perfect pixel match of different AI-generated photographs.

## Brand implementation rules

- Brand name in headings and all app-owned product packaging: **FAIRY**.
- Theme is sophisticated luxury editorial, not cartoonish/fantasy. Do not add wings, stars or magic effects as brand decoration.
- Original third-party product markings visible in the user's uploaded streetwear image are part of that source photograph; retain them until replaced by licensed real catalog photography.

Start here: **`CODEX_COPY_PASTE_PROMPT.md`**.
