# 02 — FAIRY design system and pixel spec

## Source authority and precision

The four Fairy reference screenshots are **1672 × 941** pixels. Measurements below are inferred visually from them and should be treated as **starting hypotheses**. The source screenshots do not contain font files or CSS source. Codex must use browser captures, overlays, and manual inspection to tune the implementation. Do not label these numbers as original Figma measurements.

## Colors (approved)

| Token | Hex | Use |
|---|---|---|
| `--color-espresso` | `#171512` | Header, announcement, hero background, selected dark tabs |
| `--color-pearl` | `#F7F3EC` | Browsing pages, studio, lower homepage, product panels |
| `--color-charcoal` | `#272321` | Headings, body on light, purchase buttons |
| `--color-champagne` | `#B59A80` | Underlines, subtle borders, selected ring, decorative separators |
| `--color-border` | `#DDD5CB` | Cards, rows, inputs |
| `--color-ivory-white` | `#FFFCF8` | High contrast light buttons and white text on dark |
| `--color-muted` | `#6D655F` | Secondary labels |
| `--color-rose` | `#BE8277` | Swatches and selected makeup accents only |

Avoid yellow metallic gold gradients, pink SaaS-looking boxes, neon, blur-heavy glassmorphism and generic black/white web templates.

## Typography

**Inferred font direction, not source-certified:** an elegant high-contrast fashion editorial serif such as **Bodoni Moda** for logo/headlines/nav/large buttons, paired with **Manrope** for utility text, descriptions, and micro labels. Font candidates must be visually tested. If the screenshot matches another licensed typeface substantially better, propose it with a comparison; do not quietly change typefaces. Load actual webfonts and define robust fallbacks.

| Role | Desktop approximate size | Weight | Leading / notes |
|---|---:|---:|---|
| Fairy masthead | 46px | 400 | Tracking `-0.055em`, not a cartoon emblem |
| Header nav | 21px | 400 | Serif, horizontal rhythm preserved |
| Homepage hero headline | 72px | 400 | 1.02 line-height, 2 lines at 1672 viewport |
| Inner page H1 | 62px | 400 | 1.04 line-height |
| Section title / studio title | 50px | 400 | ~1.05 leading |
| Product title | 43px | 400 | ~1.08 leading |
| Product price | 34–36px | 400 | Serif |
| Compact card title | 25–30px | 400 | Serif |
| Header tagline body | 17px | 400 | Sans; tracking approx `0.1em` |
| Body description | 15–17px | 400 | 1.55–1.65 leading |
| Breadcrumb | 14–16px | 400 | Serif or careful hybrid |
| All-caps instruction label | 11–13px | 600 | Sans with `0.18–0.25em` tracking |
| Primary CTA | 23–25px | 400 | Serif, generous height |

The logo should literally read `FAIRY`. It should look like a couture wordmark, not a fairy illustration.

## Global spacing/layout anchor points at 1672×941

| Region | Approx position |
|---|---|
| Announcement ribbon | y=0..35 (35px high) |
| Header navbar | y=35..99 (64px high) |
| Navbar logo | left 46px; baseline near y=79; width approx 120px |
| Horizontal content edge | 48px on homepage; 68–110px on inner pages depending on screen |
| Category card gap | about 14px |
| Common card radius | 8–12px |
| Common control height | 46–58px |
| Card hairline | 1px `#DDD5CB` |
| Hover/selection halo | 1–2px matte champagne, no high-saturation glow |

## Header and announcement

- Very thin dark announcement at top centered: *A new way to discover your style* (italic serif, light pearl).
- Espresso near-black nav, white FAIRY wordmark on left, fine champagne vertical divider, menu in this order: **New In, Fashion, Makeup, Skincare, Fragrance, Accessories, Shop The Look**; search, account, heart, bag icons on right.
- Menu item active underline about 3px muted champagne, not thick colored pill. Search is slim rounded white-outline field on the dark background.
- Nav should not change spacing across the four screens. Only active item changes.
- Use crisp line icons, not platform-dependent emoji. Touch targets >=44×44 CSS px even if rendered line icon is smaller.

## Buttons, fields, cards and micro-interactions

- Primary on light: `#272321` fill, warm pearl text, rectangular with modest 6–8px radius, 1px hairline. On dark hero, inverse pearl-fill dark text.
- Secondary: transparent with 1px warm gray border and charcoal text. On dark hero, transparent with pearl border and text.
- Focus visible: 2px champagne ring, `outline-offset: 3px`. Avoid suppressing focus.
- 150ms hover; 260ms drawer; 420ms click-to-zoom transition, using gentle cubic easing. Reduce/disable when motion preference requests it.
- Cards are mostly borderless editorial image blocks with quiet radius and fine outline. Avoid large drop shadows.
- Product photography must never distort. Use correct aspect ratio and documented `object-fit`/`object-position`; do not put source screenshot in CSS background.

## CSS strategy

Create one token layer (`--color-*`, `--font-*`, `--space-*`, `--radius-*`) and a stable component stylesheet. Use `clamp()` for responsive type only **after** the 1672 desktop target is matched. Fix font loading before measuring text widths. Avoid magic per-page conflicting overrides. Keep image hitboxes pinned to the image element's intrinsic coordinate viewBox so they scale with the photo.

## Audit typography visually

1. Compare the two-line hero headline wrap at x≈50/y≈180; match size, width, leading and weight.
2. Compare FAIRY masthead size and letter shapes against the latest Fairy reference, never older designs.
3. Check navigation total width and spacing before adjusting product-grid measurements.
4. Check all-caps instruction tracking on fashion/makeup screens; it is a key editorial signature.
5. Check product title widths, line wrapping and large serif CTA labels.

See `tokens/fairy-tokens.json` for machine-readable initial values. Do not treat numerical approximations as evidence of exact original source CSS.
