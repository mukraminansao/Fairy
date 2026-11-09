# 04 — Interaction and application state contract

## Object-level image shopping (signature interaction)

1. Render the actual source image in a container with **its original aspect ratio** (fashion 736×1308, makeup 1122×1402). Layer an SVG with matching intrinsic `viewBox` immediately over the image. Use `data/scenes.json` rects as initial semantic regions.
2. On pointer hover or keyboard focus, trace a delicate 1–2px champagne outline around only the selected product region; show a small tooltip with product name. On touch, a tap selects without a hover prerequisite.
3. On click/Enter/Space, commit selection state, update URL query `?item=<id>` if appropriate, smoothly scale/focus selected region for 420ms (respect reduced motion), then update detail macro, title, price, color/size options, and CTA. The source scene must remain visible.
4. Overlapping garment hit regions: highest `priority` wins, but offer a secondary visible product-selection list/menu for ambiguous overlaps; click target must not be smaller than 44px where practical.
5. Keyboard controls: Tab through each hotspot with product name and selected state; Enter/Space chooses, Escape closes zoom/detail popover. Accessible text must mirror the product selection.
6. A connector line may link selected image point to detail card. It should recalc responsively or be hidden on narrow viewports.
7. Clicking another item updates the same detail panel; no page reload or scroll jump.

## Fashion outfit state

State includes `selectedProductId`, `slots: {jacket, top, pants, shoes, jewelry, accessories}`, `savedLooks[]`, `activeVariant`, `viewMode: '2d' | '3d'`, and `cart`.

- Each selected garment occupies a slot. Replacing a garment affects only that slot, preserving others. Multiple jewelry/accessories may coexist.
- The supplied mannequin render is a **single composited front image**. Stage an honest preview from it; a genuine customizable garment swap needs separately aligned transparent layers or rigged meshes. The PNG alone cannot show different clothes or arbitrary rotations.
- A future true 3D fitting room must load authorized `.gltf/.glb` model and garment meshes, expose orbit/zoom, avoid clipping, maintain state through item changes, and provide keyboard rotation controls and performance fallback.
- If real mesh files are missing, button can lead to a **2D outfit builder** with a clear label. Do not present rotating a flat image as 360-degree try-on.
- “Add complete look” totals the currently selected product SKUs and variants; provide itemized cart confirmation.

## Makeup shopping state

State includes `selectedProductId`, `activeShadeId`, `finish`, `selectedBeautyProducts[]`, `previewMode`, and `lookId`.

- Clicking a real lipstick in the photo updates image, shade swatches and item detail without losing the set.
- Changing shade updates selected ring, preview tint, and saved look immediately.
- “Add to look” adds unique product/variant. Duplicate handling should be clear. Remove product from bag updates total.
- “Open virtual makeup try-on” retains selected products and shade, and navigates to Beauty Studio.

## Virtual Beauty Studio state

State includes `modelSource: 'catalog-model' | 'uploaded-selfie' | 'live-camera'`, `selectedProductIds`, `activeArea: lips | cheeks | eyes | skin`, `shadeByProduct`, `finishByProduct`, `intensityByProduct`, `comparePosition` (0–100), `faceZoom`, and `savedLooks`.

- **Model preview (initial):** show supplied neutral model photo. Real CSS/SVG/Canvas effects apply selected simulated tint regions to the correct facial zones. Start with lipstick and blush; do not falsely simulate physiological skin-care claims. The screenshot comparison split must be draggable (also keyboard-adjustable) and should reveal a true unmodified base vs edited composite.
- **Product intensity:** slider 0–100; shade and finish (matte/satin/gloss) are visually distinct. Reset restores defaults. Save this look stores IDs/variants/intensities locally, not a screenshot by default.
- **Upload selfie:** accept common image formats within a size limit, show consent/explanation before reading; compute only locally for MVP, let user remove image; no automatic cloud upload.
- **Use camera:** request permission only after direct user action, provide privacy notice and clear stop button; show usable fallback on denial; stop tracks when leaving page or switching mode. Needs HTTPS/localhost secure context for real camera APIs.
- **Facial landmarks:** when a real implementation is planned, detect lips/eyes/cheeks from model/selfie/camera and adapt overlay meshes. Avoid placing a rectangular transparent pink blob over the whole face. Calibrate lighting and skin tone; make preview limitation visible.
- **Rotate face:** disabled for a single flat photo unless a true multi-angle model or 3D face mesh is present; label accordingly rather than faking motion.
- **Total:** compute sum of selected unique SKU/variant prices from `data/catalog.json`, with correct currency. The initial four-product fixture gives $136.

## Cart, favorites, and browsing

- Category card clicks lead to real listing or relevant curated looks, not an inert view.
- Cart drawer shows image, variant, quantity, unit price, subtotal, and removal; supports full keyboard use and announces updates.
- Wishlist can add/remove each SKU and persists locally in the MVP.
- Search should filter catalog fixture in MVP, show result counts and empty state.
- Account and checkout actions must be clearly flagged **demo / coming later** until backend/auth/payment is actually connected.
- Fragrance and skincare show standard product detail/routine information; do not force a face or clothing mannequin preview where it makes no sense.

## Animation guidance

- Product hover/focus: 150ms border/opacity.
- Click-to-detail: 420ms camera-like zoom that preserves object continuity; no sudden layout shift.
- Panel/drawer: 260ms ease.
- Respect `prefers-reduced-motion`: instant state updates, no positional zoom.
- Keep FPS high with transform/opacity-based animations; do not trigger full-page rerender or giant image downloads on each selection.

## Accessibility & privacy

- Clickable product regions have accessible names, focus styling, and keyboard alternatives.
- All model/camera modes explain data use and permission; do not store or transmit biometric/face data without new consent and legal review.
- Use honest product shade warning: **Digital preview; actual shades may vary with lighting and skin tone.**
- Do not imply suitability, medical benefit, or fit certainty from a simulated preview.
