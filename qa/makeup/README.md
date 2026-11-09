# Soft Rose Edit review

Captured in Chrome on Windows at 1672 × 941 CSS pixels and device pixel ratio 1.

- [Approved reference](../../assets/references/03_fairy_makeup_shoppable.png), [browser capture](desktop.png), and [side-by-side comparison](comparison.png)
- [First pass](first-pass.png), [50% overlay](overlay.png), and [pixel diff](diff.png)
- [1440px desktop](1440.png), [768px tablet](768.png), and [390px mobile](390.png)

The revision fits the headline on one line at the reference width, brings the full product arrangement into view, and tightens the lipstick and model crops. It uses the shared Newsreader headings, black text, and warm pearl background. The mean absolute RGB difference decreased from 31.55 to 26.08 out of 255. The supplied product photo has a different arrangement and shadow pattern, and the neutral model has different hair and framing. Six working shade controls follow the catalog fixture.

All nine product shapes follow the supplied photograph and can be selected by mouse, touch, or keyboard. The lipstick uses the supplied studio macro. The other eight use 1254 × 1254 studio images generated from the supplied flat-lay, with the lipstick image as the style reference. The product picker gives a second way to select an item. On tablet and mobile, a tap moves focus and scrolls to the selected product details.

Shade changes update the simulated lipstick on the sample model, and the comparison slider works with touch, mouse, and keyboard. The selected shade and products persist in the current browser and carry into the makeup preview. The preview applies lipstick and blush tints. The full Beauty Studio has its own upcoming visual review.

The 40-test Playwright suite covers the desktop capture, all nine photo hotspots, navigation, keyboard zoom and comparison, persistent state, the preview subtotal, and responsive layouts.

The desktop connector follows the selected item in the photo and ends at its matching close-up. The [selected makeup brush capture](studio-photo.png) shows the curve from the bottom of the photograph. The connector is hidden at widths of 1200px and below.

## Studio photo generation

Built-in ImageGen produced eight square product images. The final WebP assets are under [public/assets/makeup/items](../../public/assets/makeup/items/). [Before](connector.png) and [after](studio-photo.png) browser captures show the updated brush detail at 1672 × 941.

The common prompt restaged only the named product from the supplied flat-lay, using the Satin Lipstick macro for lighting and composition. It called for pale-peach travertine, blurred blush-pink blossoms, warm slanted window shadows on creamy beige plaster, crisp product texture, a grounded contact shadow, and square framing with room around the full product. It asked for the supplied packaging lettering and omitted other products and interface text.

- Rose Blush uses an open round black FAIRY compact with dusty-rose powder, shot from slightly above.
- Skin Tint Foundation uses the frosted warm-beige bottle, glossy black cap, and FAIRY / SKIN TINT / FOUNDATION label.
- Radiance Serum uses the ivory frosted bottle, rose-gold collar, white dropper bulb, and FAIRY / RADIANCE / SERUM label.
- Warm Nude Eyeshadow uses the champagne case and two rows of three pans in the original nude, rose, and bronze shades.
- Defining Mascara uses the satin-black FAIRY tube and its separate tapered wand in the same frame.
- Soft Coverage Concealer uses the slim frosted vial, tall black cap, and FAIRY / CONCEALER label.
- No. 03 Eau de Parfum uses beveled glass, amber liquid, a black cap, and the FAIRY / No. 03 / EAU DE PARFUM label.
- Precision Makeup Brush uses ivory-tipped chestnut bristles, a rose-gold ferrule, and the satin-black FAIRY handle on a diagonal.
