# 05 — Asset manifest, mapping and provenance

## Source files and approved screenshots

| File (relative to kit root) | Role | Rules |
|---|---|---|
| `assets/references/01_fairy_homepage.png` | Pixel/style target, 1672×941 | **Reference only**; do not serve as UI screenshot wallpaper |
| `assets/references/02_fairy_fashion_shoppable.png` | Pixel/style target | Reference only |
| `assets/references/03_fairy_makeup_shoppable.png` | Pixel/style target | Reference only |
| `assets/references/04_fairy_virtual_beauty_studio.png` | Pixel/style target | Reference only |
| `assets/original/streetwear_flatlay_user.jpg` | Main **clickable** fashion image, 736×1308 | User-provided original; preserve complete arrangement and inspect rights before commercial launch |

## Production-usable visual assets

| File in `assets/images/` | Intended use | Intrinsic size |
|---|---|---|
| `hero_fairy_dark.png` | Dark homepage campaign hero photograph, with live text placed by HTML | 1671×941 |
| `makeup_flatlay_fairy.png` | Clickable beauty scene | 1122×1402 |
| `face_base_neutral.png` | Baseline model image for simulated virtual makeup | 1122×1402 |
| `mannequin_outfit_front.png` | Transparent front-view **2D** outfit preview | 941×1672 RGBA |
| `lipstick_soft_mocha_macro.png` | Large lipstick closeup / selected product zoom | 1254×1254 |
| `silver_cross_pendant_macro.png` | Large necklace closeup / selected product zoom | 1254×1254 |
| `skincare_category.png` | Skincare card and catalog fallback | 1448×1086 |
| `fragrance_category.png` | Fragrance card and catalog fallback | 1448×1086 |

Use product photo scenes as source for thumbnail crops in early prototype where a standalone photo is not provided. **Do not pull random third-party images from the internet.** Add independent licensed product shots as the catalog grows. The starter virtual studio look is in `data/look-presets.json`; approximate masks for the synthetic neutral model are in `data/face-regions.json` and need visual calibration.

## Page-to-asset map

- Homepage hero → `hero_fairy_dark.png` (photographic asset, not an image of page).
- Homepage Fashion & Outfits category → `streetwear_flatlay_user.jpg`, cropped for horizontal card with `object-fit: cover` while the full image is preserved on the shoppable scene page.
- Homepage Makeup category → `makeup_flatlay_fairy.png`, cropped card.
- Homepage Skincare category → `skincare_category.png`.
- Homepage Accessories category → `silver_cross_pendant_macro.png` (or a later dedicated accessories scene).
- Homepage Fragrance category → `fragrance_category.png`.
- Fashion shoppable large left image → `streetwear_flatlay_user.jpg` **full image / `contain`, not `cover`**.
- Fashion selected pendant macro → `silver_cross_pendant_macro.png`.
- Fashion preview mannequin → `mannequin_outfit_front.png`, preserve alpha and contain.
- Makeup shoppable large left image → `makeup_flatlay_fairy.png` **full image / `contain`**.
- Makeup selected lipstick macro → `lipstick_soft_mocha_macro.png`.
- Beauty Studio primary preview → `face_base_neutral.png`, edited dynamically in Canvas/SVG rather than serving one frozen before/after screenshot.

## Ownership and integrity

- User uploaded the original streetwear reference and requested its use as the clickable fashion scene. Source rights/third-party clothing marks should be reviewed before public commercial use.
- Other standalone photos and all four Fairy screenshot references were generated for this design handoff. Brand labels on those assets are FAIRY.
- None of these files is a rigged 3D model, calibrated makeup texture library, or paid commercial inventory feed.
- Do not rename assets during the first implementation without updating the catalog and scene manifests.
- Preserve original source dimensions, alpha, and quality. Any optimized WebP/AVIF versions should be produced in the app's build pipeline while retaining originals in this kit.

## Asset presentation rules

1. Avoid stretched or unnaturally warped products: source dimensions and `object-fit` must be deliberate.
2. Give images descriptive `alt` text; decorative backdrop may use empty alt.
3. Ensure zoom photographs are high-quality standalone images (supplied), not an enlarged low-resolution crop from the website screenshot.
4. Overlay product hotspots in responsive SVG matching the actual image's intrinsic pixel coordinate system. A CSS transform on the image must also transform the overlay.
5. Use a genuine CSS/HTML FAIRY masthead (or the supplied SVG fallback), never crop the masthead from screenshot.
6. A snapshot of the approved UI may be used in developer QA, never as the actual shipped interface.

## Remaining art assets for a full commercial site

These require future owner-provided/approved assets: isolated photo per real SKU/variant, clothing front/back/detail shots, accurate shade swatches, size charts, product descriptions/ingredients, actual stock and price feeds, a licensed rigged avatar, each garment `.glb` mesh / fit data, alternate skin-tone reference models, brand/legal photography rights, responsive art direction for mobile. The included images are sufficient for a strong *visual prototype* of the approved screens, not a complete real inventory.

Peach Atelier, Mocha Sculpt, and Midnight Pearl use newly generated FAIRY editorial flat-lays and separately generated macro product photography. Product macros were exported individually from dedicated contact sheets; none is enlarged from its flat-lay. The three sets add 36 unique demo SKUs and 36 independent image-space hotspots.
