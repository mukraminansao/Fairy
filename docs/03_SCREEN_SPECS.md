# 03 — Approved screen-by-screen specs

All coordinates are **visual estimates** in CSS pixels at reference viewport **1672×941**, not exported design coordinates. Match actual reference images with screenshot overlays. Build real HTML/CSS; keep photos in their own image elements.

## Screen 01 — Homepage (`/`)

Reference: `assets/references/01_fairy_homepage.png`.

- Announcement 35px high; common dark header 64px high; dark hero from y≈99 to y≈538. Warm pearl section below until bottom.
- Brand at x≈45, y≈47; serif FAIRY in pearl white. Search field at upper-right, outline 1px pearl.
- Hero H1 left x≈50, y≈180, width ≈620px, two lines: **“Everything you love. / Beautifully together.”** Very large serif ~72px, pearl white.
- Hero subtitle x≈52, y≈347, 2 lines: **“Explore fashion and beauty through shoppable looks, curated rituals, and pieces that feel like you.”** Sans ~17px with noticeable tracking.
- CTAs: first x≈49/y≈422, width≈286, height≈60, ivory fill/dark serif; second x≈352/y≈423, width≈296, height≈59, dark transparent/ivory outline. Text: **Explore collections** and **Shop interactive looks**.
- Right hero photography must use `assets/images/hero_fairy_dark.png`; preserve left dark negative space for live HTML copy. On lipstick, subtle selectable hairline halo and small white tooltip **“Shop this item”**. Use actual click logic (route to makeup selection), not baked UI.
- Lower pearl section: centered section title **“Shop by world”** at y≈558, ~50px serif, flanked by fine taupe horizontal rules. Category photos begin y≈622, finish y≈808, with label bands to y≈854. Five equal-ish columns across x≈47..1627, ~14px gaps.
- Cards order: **Fashion & Outfits, Makeup, Skincare, Accessories, Fragrance**. Use the supplied scene/category photographs, not screenshots; each card clickable. Images about 180–190px tall, label ~24px serif and right arrow. Use aspect crop carefully.
- Bottom instructional strip y≈878..940: *Discover the look* followed by three steps: **Tap an item to shop / View details and options / Build your look and add to bag**. Thin separators and small simple icons. Avoid oversized illustrations.

## Screen 02 — Fashion shoppable scene (`/looks/monochrome-street`)

Reference: `assets/references/02_fairy_fashion_shoppable.png`.

- Shared dark header y=0..99. Pearl body.
- Breadcrumb at x≈110/y≈113: **Home / Fashion / Monochrome Street**.
- Main title at x≈111/y≈146, ~62px: **Make the look yours.** Instruction below: **Click any item in this image to see it up close.** (small uppercase-like tracking).
- Left photo container x≈102/y≈242, width≈608, visible to bottom y≈935. The source **must be the original user's flat-lay** (`assets/original/streetwear_flatlay_user.jpg`). It is portrait ratio 736/1308. Do not substitute a model image or crop away the headphones, sunglasses, pendant, watch, bag, pants or shoes.
- Headline within photo small **01 / MONOCHROME STREET**. On default state, highlight the necklace in the right-hand product area directly, with a thin champagne ring and tiny tooltip **Selected: Silver Pendant**. Hotspot is bound to the real product shape; no number dots needed.
- Right region starts x≈760. Tabs around y≈151: **Item details** active underline, **Virtual try-on** inactive.
- Macro photo x≈760/y≈212, ~420×419, image `silver_cross_pendant_macro.png` in soft round-corner card. Product details to right x≈1210: **Silver Cross Pendant**, **$48**, short description, material / finish rows, color swatches, dark **Add to look** CTA, **View product details**.
- Lower right panel x≈760/y≈656..935: neutral featureless mannequin front image (`mannequin_outfit_front.png`) at left, **Your look so far** at right, list **Jacket · Tee · Cargo pants · Sneakers · Pendant**, outlined **Open virtual fitting room** CTA.
- The connector line from the selected image pendant to detail macro is a visual cue; implement as live SVG (not a static photo overlay).

## Screen 03 — Makeup shoppable scene (`/looks/soft-rose-edit`)

Reference: `assets/references/03_fairy_makeup_shoppable.png`.

- Shared dark header y=0..99; **Makeup** active underline. Pearl body.
- Breadcrumb x≈97/y≈114: **Home / Makeup / Soft Rose Edit**.
- Title at x≈92/y≈148: **Create your signature glow.** Instruction: **Tap any product in this photo to shop the exact shade.**
- Left photo x≈68/y≈250, width≈662, bottom≈925: use **`assets/images/makeup_flatlay_fairy.png`**. The independent lipstick/blush/foundation/eyes/etc all clickable directly in the scene.
- Default selected lipstick has thin champagne outline and tooltip **Selected: Satin Lipstick**, pointer on object; connector to macro detail at upper right.
- Right top tabs y≈150: Item details active, Virtual try-on inactive. Macro photo at x≈768/y≈205, ~413×391 with **`lipstick_soft_mocha_macro.png`**. Details at x≈1213: **Satin Lipstick**, **$28**, short copy, **Shade · Soft Mocha**, six swatches, dark **Add to look**, outlined **Product details**.
- Right lower from x≈768/y≈627: before/after face preview in wide ~413×290; adjacent text **Try the shade on you**, **Your beauty edit**, **Lipstick · Blush · Skin Tint**, **Open virtual makeup try-on**.
- Maintain the same typography and spacing system as fashion. Product details change, layout language stays consistent.

## Screen 04 — Virtual Beauty Studio (`/studio/beauty?look=soft-rose-edit`)

Reference: `assets/references/04_fairy_virtual_beauty_studio.png`.

- Shared dark header y=0..99, Makeup active. Pearl body.
- Breadcrumb x≈48/y≈115 **Makeup / Soft Rose Edit / Virtual Studio**.
- Center title x≈607/y≈112 **Your beauty, your way.** ~50px serif; subtitle beneath **Try shades together. Find the look that feels like you.**
- Three-column workspace begins around y≈223; left x≈39..398, center x≈417..1172, right x≈1198..1640.
- Left: **Your makeup bag** (~35px serif), four product rows with actual thumbnails and prices (Soft Mocha Lipstick $28, Rose Blush $34, Skin Tint Foundation $42, Warm Nude Eyeshadow $32), **Add another product**, **Areas to style** chips LIPS/CHEEKS/EYES/SKIN.
- Center top controls: **Model preview** selected, **Upload selfie**, **Use camera**, Zoom 100%. Big close-up neutral face from `face_base_neutral.png` cropped carefully into x≈418/y≈285 width≈753 height≈547; before/after vertical draggable divider at center. Add optional simulated color layers on lips and cheeks. Labels **Before** and **After** within image near bottom. Under: **Compare before/after** toggle, rotate face arrows (disabled/explained for a 2D model; no fake 3D) and photo note.
- Right: **Customize your look**, lipstick thumbnail, **Satin Lipstick**, **Shade · Soft Mocha**, six swatches, **Intensity** slider default 75%, **Finish** Matte / **Satin** / Gloss, **Reset look**, **Save this look**, dark **Add 4 products to bag · $136**.
- Footer note: **Digital preview; actual shades may vary with lighting and skin tone.**
- The 4 selected demo products sum to $136. Keep totals computed from data, never hard-code a shopping total.

## Responsive targets without source reference

These are design extrapolations, **not approved pixel-exact screenshots**:

- At <=1023px: stack or collapse secondary columns with clear tabs; navbar may become scrollable/compact; product photo remains prominent.
- At <=639px: category cards horizontal-scroll; header uses hamburger, search, bag; clickable scene fits screen with correct aspect ratio and tappable overlay targets; product details open accessible bottom sheet; studio becomes face canvas + bottom product drawer; do not shrink 3 desktop columns to unreadability.
- Validate at 1440×900, 768×1024, 390×844. No horizontal scroll aside from intentional carousels.
