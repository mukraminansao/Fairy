# Instructions for Codex — FAIRY project

These instructions apply to the entire repository after this kit is copied into it.

## Non-negotiables

1. The final brand is **FAIRY** (uppercase logo). Do not introduce earlier working names into UI, source strings, assets, sample data, comments, or metadata.
2. Open and inspect all four images in `assets/references/` before writing components. They are the approved desktop visual targets, at **1672×941**.
3. Read `00_READ_ME_FIRST.md`, **every file in `docs/`**, `stack/fairy-stack.json`, `prisma/schema.prisma`, and the config examples before coding.
4. Use the real files from `assets/images/` and `assets/original/`. Never build the UI by displaying a reference screenshot as a page background. Never use emoji, random stock imagery, or generic gradient placeholders where supplied visual assets exist.
5. Keep visible headings, text, hierarchy, spacing, image crops, alignment, and colors as close to the references as practical. Use central shared tokens; no independent ad hoc theme per page.
6. Work in small visual gates: homepage first; fashion second; makeup third; virtual studio fourth; integrations thereafter. At each gate, capture a browser screenshot at 1672×941, compare it against `assets/references/`, correct discrepancies, and report what remains imperfect.
7. Make genuine user interactions. If 3D orbit, clothing mesh fitting, real-time cosmetic camera tracking, checkout processing, authentication, or other advanced features lack required assets/credentials, state precisely what is missing. Do not ship fake buttons or falsely label a static image as functional 3D/AR.
8. Do not mutate/delete supplied reference files. Keep source design assets separate from compiled production assets.
9. Keep user-uploaded selfies private by default. Camera access must require clear permission. Never send selfies to third-party services without explicit authorization.
10. Respect keyboard navigation, visible focus states, alt text, reduced motion, responsive layouts, and test coverage while matching visuals.
11. **Stack is fixed**: Next.js App Router + React + TypeScript + CSS Modules/CSS variables; Next.js server/route handlers; PostgreSQL + Prisma ORM; Auth.js with Prisma adapter; Playwright for screenshots/e2e. Do **not** switch to Vite, PHP/XAMPP, MySQL, SQLite, Firebase, Supabase-as-replacement, or an unrelated UI component kit without owner approval. Confirm compatible versions and commit a lockfile.
12. Server-side authorization and input validation are mandatory for protected mutations. Do not trust cart prices, product stock, totals, role, or admin identity sent by the browser. Use transactions and integer minor-unit amounts. No real payment capture, selfie storage or purported 3D fitting without the missing approvals/assets.

## Definition of done for each screen

- Screenshot at 1672×941 visually checked against target; pass the checklist in `docs/06_VISUAL_QA_ACCEPTANCE.md`.
- All major elements use the right asset, type scale, background, spacing, and border details.
- Every visible control either works or is clearly marked unavailable with a stated dependency.
- The entire screen survives 390px mobile and 768px tablet widths without overflow.
- No remaining earlier-brand user-facing text.
- A screenshot and concise parity report accompany the implementation.
