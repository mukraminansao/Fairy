# 06 — Visual QA and acceptance gates

## Why visual diff matters

The target is to **match the approved Fairy screenshots closely**, not merely produce a website with similar colors and cards. No tool can truthfully guarantee pixel-identical reconstruction from screenshots because original CSS, exact fonts, and exact isolated product photography are unknown. Use measurable screen geometry, QA screenshots, and user signoff to narrow differences.

Playwright supports browser screenshot assertions, but reference snapshots must be captured consistently: https://playwright.dev/docs/test-snapshots. Browser/OS/font rendering affects pixels, so compare on one fixed machine and browser.

## Required screenshot procedure

1. Fix browser window viewport to **1672×941**, DPR 1, same browser for all target pages. Wait until webfonts and all visible images load; disable animations or settle them in a deterministic state.
2. Navigate directly to each route in its approved state and preload fixture data. For scenes, select the intended product (pendant or lipstick) before capture; hover/cursor cue can be recreated with test pointer coordinates.
3. Capture the page. Keep files such as `qa/actual/01_homepage.png` distinct from `assets/references/01_fairy_homepage.png`.
4. Run `scripts/compare_screens.py reference actual --output qa/diff/01.png --overlay qa/overlay/01.png`. Inspect 50% blend plus side-by-side at 100% zoom.
5. Fix discrepancies in priority order: page blocks / photo content / masthead / typography size and wrapping / card geometry / button dimensions / micro spacing / hairline colors / icons.
6. Repeat. Record before/after screenshots, measurements and unresolved discrepancies. Ask for owner approval at each screen gate.

## Practical acceptance bands (not source truth)

- Brand name **FAIRY** everywhere: zero exceptions. Correct navigation and category ordering: zero exceptions.
- Major section boundaries (header, hero, category section): target within ~5px at 1672×941 after font loading.
- Main photo card, product macro, preview panel boundaries: ideally within ~8px, then refine.
- Headline wrap and leading must match reference; slight anti-aliasing variation is acceptable, wrong font family or wrong line count is not.
- Colors use approved exact tokens unless the screenshot comparison justifies a small adjustment.
- Every supplied image used in its intended role; no unrelated generic imagery or placeholder gradients.
- Buttons are genuinely interactive; dialogs work and are dismissible; cart totals computed accurately.
- No horizontal overflow at 390px/768px; tap targets and text remain usable.
- Meaningful focus state, alt text, accessible selection semantics, reduced-motion support.
- Performance: image assets lazy-loaded where appropriate; large hero and product scene displayed cleanly with no layout shift.

## Screen QA matrix

| Gate | Target reference | Critical pass conditions |
|---|---|---|
| Home | `01_fairy_homepage.png` | Black header and hero, pearl category section, 5 category cards, same 2-line H1 and CTAs, brand and photo match |
| Fashion | `02_fairy_fashion_shoppable.png` | Original full flat-lay, direct necklace hotspot, precise detail photo and panel, look-summary mannequin |
| Makeup | `03_fairy_makeup_shoppable.png` | Cosmetic scene, direct lipstick hotspot, selected shade and detail, face preview CTA |
| Beauty Studio | `04_fairy_virtual_beauty_studio.png` | 3-column geometry, large accurate face crop, before/after, product stack, swatches, slider, totals |

## Interaction tests beyond appearance

1. From home, navigate via all five category cards and both main CTAs.
2. Click, tap, and keyboard-focus every defined product hotspot; correct item details appear.
3. Check fashion overlap behavior where tee sits inside jacket, pants below, worn necklace vs separate accessory. Adjust hit areas and priorities.
4. Test beauty lipstick, blush, eyeshadow, foundation and perfume hotspots; selection must match actual image location.
5. Change lipstick shade/intensity/finish; visual preview responds; before/after slider reveals correct base.
6. Add/remove all four initial makeup products; total correct ($28+$34+$42+$32 = $136).
7. Save and reset look; verify saved state and reset behavior.
8. Verify no camera request occurs until user presses Use camera, permission denial works, camera stops on leave.
9. Verify 2D mannequin is not labeled as functioning 3D rotation; advanced feature is disabled/explained until real mesh source exists.
10. Validate accessibility by keyboard-only run and a basic automated audit.

## Screenshot report format Codex must provide

```
FAIRY Visual Gate: [name]
Viewport / browser / DPR:
Reference path:
Actual screenshot path:
Overlay/diff path:
Geometry parity (notes):
Typography parity (notes):
Color parity (notes):
Photography parity (notes):
Interactions tested:
Responsive / accessibility checks:
Known gaps and missing assets:
What changed this iteration:
Ready for owner signoff? Yes/No
```

Do not use one global diff percentage as the only pass/fail gate. Photo assets legitimately differ from the composed screenshot; inspect structure and UI regions separately. If necessary, mask photography when evaluating font/layout differences.
