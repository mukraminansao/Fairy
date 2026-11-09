# FAIRY homepage review

**Ready for owner review.** Chrome 156 on Windows, 1672 × 941 CSS pixels at device pixel ratio 1.

- [Approved reference](../../assets/references/01_fairy_homepage.png) and [revised browser capture](desktop.png)
- [Side by side](comparison.png), [50% overlay](overlay.png), and [pixel diff](diff.png)
- [Previous homepage](previous-desktop.png) and [first pass](first-pass.png)
- [1440px desktop](1440px.png), [768px tablet](768px.png), and [390px mobile](390px.png)

| Area | Result |
| --- | --- |
| Geometry | The hero begins at y=102, the pearl section at y=538, and the category cards at y=622. The campaign buttons and two-line headline follow the reference layout. |
| Typography and color | Browser samples of Bodoni Moda, Newsreader, Libre Caslon Display, and Times New Roman were compared against the reference. Newsreader gave the closest serif shapes and stroke weight. Sampled reference pixels informed the switch to pure black for the titles, card labels, guide, and primary CTA text. Manrope remains the utility typeface. Exact glyph shapes and spacing differ slightly from the raster reference. |
| Photography | The standalone hero and five category photos were regenerated against the approved compositions. The jacket and cross pendant sit behind the cosmetics, and the lipstick control aligns with the new tube. Lighting, product proportions, and flower placement still differ slightly from the reference. |
| Responsive and accessibility | The mobile and tablet compositions were inferred from the approved desktop design. Playwright verified no horizontal overflow at 390, 768, and 1440 pixels, touch menu and hotspot actions, keyboard activation, and Escape dismissal with focus return. |
| Behavior | The cards, campaign links, and lipstick hotspot lead to fixture-backed previews. Search, saved items, and the browser-persisted USD demo bag were tested. |

The mean absolute RGB difference moved from 33.32/255 in the previous homepage capture to 25.88/255 in the revision. The side-by-side and overlay show where the artwork and type changed.

Six Playwright tests passed, along with the production build, type check, and lint.

