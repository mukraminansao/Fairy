import additionalEffects from "../../data/additional-beauty-effects.json";
import type { ContourPlacement } from "./contour-zones";
import type { ContourSketch } from "./contour-sketch";
import scenes from "../../data/scenes.json";
import { products } from "./catalog";
import { getLookProduct } from "./look-sets";

export const makeupHref = "/looks/soft-rose-edit";
export const beautyStudioHref = "/studio/beauty";
export const makeupScene = scenes.scenes.find(({ id }) => id === "soft-rose-edit")!;
export const lipstickId = makeupScene.defaultSelectedProductId;
export const lipstickShades = products.find(({ id }) => id === lipstickId)!.shades!;
export const defaultShade = lipstickShades.find(({ id }) => id === "soft-mocha")!;
export const findLipstickShade = (id: unknown) => lipstickShades.find((shade) => shade.id === id);
export const getLipstickShade = (id?: string) => findLipstickShade(id) ?? defaultShade;
export const lipstickVariantKey = (shadeId: string) => shadeId === defaultShade.id ? lipstickId : lipstickId + ":" + shadeId;
export const eyeshadowId = "b-eyeshadow";
// Colors sampled from the centers of the six pans in the Soft Rose flat-lay.
export const eyeshadowShades = [
  { id: "champagne", name: "Champagne", hex: "#f6cdb1" },
  { id: "soft-coral", name: "Soft Coral", hex: "#eca896" },
  { id: "dusty-rose", name: "Dusty Rose", hex: "#d78f7b" },
  { id: "peach-nude", name: "Peach Nude", hex: "#e9b196" },
  { id: "terracotta", name: "Terracotta", hex: "#d0836d" },
  { id: "deep-bronze", name: "Deep Bronze", hex: "#a26848" },
];
export const getEyeshadowShade = (id?: string) => eyeshadowShades.find((shade) => shade.id === id) ?? eyeshadowShades[5];

export type TryOnPan = { id: string; name: string; hex: string };
const otherPalettes: Record<string, readonly TryOnPan[]> = {
  "b-espresso-satin-shadow": [
    { id: "gold-fleck", name: "Gold Fleck", hex: "#ae7954" },
    { id: "satin-cocoa", name: "Satin Cocoa", hex: "#8f6144" },
    { id: "espresso-matte", name: "Espresso Matte", hex: "#694436" },
    { id: "bronze-spark", name: "Bronze Spark", hex: "#9b5a37" },
  ],
  "b-cool-sculpt-duo": [
    { id: "sheer-taupe", name: "Sheer Taupe", hex: "#8b746d" },
    { id: "deep-taupe", name: "Deep Taupe", hex: "#6a534d" },
  ],
};
export function tryOnPalette(id: string) {
  return id === eyeshadowId ? eyeshadowShades : Object.hasOwn(otherPalettes, id) ? otherPalettes[id] : undefined;
}
export function getProductPan(id: string, panId?: string) {
  if (id === eyeshadowId) return getEyeshadowShade(panId);
  const palette = tryOnPalette(id);
  return palette?.find(({ id }) => id === panId) ?? palette?.[0];
}
export function readProductPans(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value).filter(([id, pan]) =>
    id !== eyeshadowId && typeof pan === "string" && tryOnPalette(id)?.some((option) => option.id === pan),
  )) as Record<string, string>;
}

// The supplied boxes are approximate. These silhouettes follow the actual 1122 × 1402 photograph.
const details: Record<string, { shape: string; bounds: [number, number, number, number]; label: string; description: string }> = {
  "b-blush": {
    shape: "M63 376C63 331 168 281 275 281C333 281 357 291 363 321C373 351 362 372 321 389C360 417 381 454 381 503C381 585 325 647 227 647C134 647 77 589 77 505C77 475 88 447 103 425C76 421 63 402 63 376Z",
    bounds: [56, 275, 333, 379], label: "Blush",
    description: "A silky rose powder that builds from a soft flush to a richer wash of color.",
  },
  "b-lipstick": {
    shape: "M420 397V343C420 318 434 296 452 284C468 273 480 284 480 323V397H487Q493 398 493 408V510Q499 510 499 520V634Q499 647 487 647H416Q402 647 402 633V521Q402 510 408 509V408Q408 397 420 397Z",
    bounds: [396, 274, 109, 381], label: "Lipstick",
    description: "A creamy, satin-finish lipstick that delivers rich, buildable color with a smooth, comfortable feel and a soft, luminous sheen.",
  },
  "b-foundation": {
    shape: "M642 333V204Q642 191 714 191Q785 191 785 204V334Q797 337 797 351V613Q797 637 773 637H658Q631 637 631 615V351Q631 337 642 333Z",
    bounds: [627, 186, 175, 455], label: "Skin Tint",
    description: "A lightweight skin tint with sheer, buildable coverage and a naturally luminous finish.",
  },
  "b-serum": {
    shape: "M917 335V281C917 242 973 241 973 281V335H984Q994 335 994 348V416H1004Q1021 417 1021 433V616Q1021 634 1004 634H894Q875 634 875 615V433Q875 416 893 416H900V348Q900 335 917 335Z",
    bounds: [868, 246, 160, 394], label: "Serum",
    description: "A lightweight serum with a silky texture. Layer it under makeup as part of your routine.",
  },
  "b-eyeshadow": {
    shape: "M57 786L82 731H416L434 780V806H428V1016Q428 1035 407 1038H88Q65 1037 65 1018V807H57Z",
    bounds: [52, 726, 388, 318], label: "Eyeshadow",
    description: "Six warm nude, rose, and bronze tones for softly defined eyes.",
  },
  "b-mascara": {
    shape: "M481 1076V830Q481 822 490 820V782Q490 765 520 765Q547 765 547 780V821Q557 822 557 833V1076Q557 1092 521 1092Q481 1092 481 1076Z M567 1080V935Q567 924 591 923V827C580 814 581 754 596 733C611 738 620 803 607 828V923Q636 924 636 935V1080Q636 1094 604 1094Q567 1094 567 1080Z",
    bounds: [476, 726, 166, 375], label: "Mascara",
    description: "A deep black mascara with a tapered brush for separating and defining lashes.",
  },
  "b-concealer": {
    shape: "M671 722Q671 705 709 705Q745 705 745 722L748 1078Q748 1097 729 1097H693Q671 1097 671 1078Z",
    bounds: [665, 700, 89, 403], label: "Concealer",
    description: "A creamy, soft-coverage concealer for a touch of coverage wherever you want it.",
  },
  "b-fragrance": {
    shape: "M884 776V690Q884 674 932 673Q984 673 984 690V775H1039Q1069 776 1069 802V1060Q1068 1091 1036 1091H828Q799 1091 800 1062V803Q801 775 827 775Z",
    bounds: [793, 668, 283, 429], label: "Fragrance",
    description: "No. 03 Eau de Parfum, featured in the Soft Rose Edit.",
  },
  "b-brush": {
    shape: "M98 1185C98 1131 117 1079 167 1071C217 1063 267 1102 309 1126L529 1149L854 1178Q901 1182 898 1217Q893 1251 851 1250L525 1244L302 1241C249 1256 210 1280 164 1282C119 1282 98 1242 98 1185Z",
    bounds: [89, 1064, 814, 225], label: "Brush",
    description: "A soft, full brush for sweeping and blending powder across the cheeks.",
  },
};

export const makeupItems = makeupScene.hotspots.map((spot) => ({
  ...spot,
  product: products.find(({ id }) => id === spot.productId)!,
  ...(details[spot.productId] ?? {
    shape: ("shape" in spot ? spot.shape : undefined) ?? "",
    bounds: spot.rect as [number, number, number, number],
    label: getLookProduct(spot.productId).name,
    description: getLookProduct(spot.productId).description ?? "",
  }),
}));

export type MakeupItem = (typeof makeupItems)[number];

export function getMakeupItem(id?: string | null) {
  return makeupItems.find(({ productId }) => productId === id) ??
    makeupItems.find(({ productId }) => productId === lipstickId)!;
}

export const beautyFinishes = ["Matte", "Satin", "Gloss"] as const;
export type BeautyFinish = (typeof beautyFinishes)[number];
export type BeautyLook = {
  ids: string[];
  lipstickShadeId: string;
  eyeshadowShadeId: string;
  intensities?: Record<string, number>;
  productPanIds?: Record<string, string>;
  finishes?: Partial<Record<string, BeautyFinish>>;
  contourPlacement?: ContourPlacement;
  contourSketch?: ContourSketch;
};
export const defaultBeautyLook: BeautyLook = {
  ids: [lipstickId, "b-blush", "b-foundation"],
  lipstickShadeId: defaultShade.id,
  eyeshadowShadeId: getEyeshadowShade().id,
};

export const studioBeautyLook: BeautyLook = {
  ...defaultBeautyLook,
  ids: [...defaultBeautyLook.ids, eyeshadowId],
};

const areaEffects = { lips: "lipColor", cheeks: "blushColor", eyes: "shadowColor", skin: "skinColor",
  brows: "browColor", lashes: "lashColor", contour: "contourColor", eyeliner: "linerColor" } as const;
export type BeautyArea = keyof typeof areaEffects;
type EffectArea = (typeof areaEffects)[BeautyArea];
export type BeautyEffects = Partial<Record<EffectArea, string>> & {
  strength?: Partial<Record<EffectArea, number>>;
  lipFinish?: BeautyFinish;
  contourSketch?: ContourSketch;
};

const effects: Record<string, { area: EffectArea; color: string }> = {
  ...additionalEffects as Record<string, { area: EffectArea; color: string }>,
  "b-lipstick": { area: "lipColor", color: defaultShade.hex },
  "b-berry-lip": { area: "lipColor", color: "#7d2948" },
  "b-caramel-lip": { area: "lipColor", color: "#a85c3b" },
  "b-mulberry-oil": { area: "lipColor", color: "#91435b" },
  "b-blush": { area: "blushColor", color: "#d05366" },
  "b-apricot-blush": { area: "blushColor", color: "#d16b39" },
  "b-berry-blush": { area: "blushColor", color: "#c4628a" },
  "b-cinnamon-bronzer": { area: "contourColor", color: "#835434" },
  "b-rose-brow": { area: "browColor", color: "#4c3a33" },
  "b-amber-brow": { area: "browColor", color: "#85573b" },
  "b-mascara": { area: "lashColor", color: "#2a211f" },
  "b-plum-mascara": { area: "lashColor", color: "#55313e" },
  "b-burgundy-pencil": { area: "linerColor", color: "#713746" },
  [eyeshadowId]: { area: "shadowColor", color: getEyeshadowShade().hex },
  "b-bronze-shadow": { area: "shadowColor", color: "#95592d" },
  "b-plum-shadow": { area: "shadowColor", color: "#765075" },
  "b-foundation": { area: "skinColor", color: "#e8ad83" },
  "b-golden-tint": { area: "skinColor", color: "#c89158" },
};

const intensityDefaults = { lipColor: 75, blushColor: 45, shadowColor: 40, skinColor: 35, browColor: 30, lashColor: 50, contourColor: 40, linerColor: 45 };

export function beautyArea(id: string) {
  return (Object.keys(areaEffects) as BeautyArea[]).find((area) => areaEffects[area] === effects[id]?.area);
}

export function beautyIntensity(look: BeautyLook, id: string) {
  return look.intensities?.[id] ?? intensityDefaults[effects[id]?.area] ?? 0;
}

export function getBeautyEffects(look: BeautyLook): BeautyEffects {
  const strength: NonNullable<BeautyEffects["strength"]> = {};
  const colors: BeautyEffects = { strength };
  for (const id of look.ids) {
    const effect = effects[id];
    if (effect) {
      colors[effect.area] = id === lipstickId ? getLipstickShade(look.lipstickShadeId).hex
        : id === eyeshadowId ? getEyeshadowShade(look.eyeshadowShadeId).hex : getProductPan(id, look.productPanIds?.[id])?.hex ?? effect.color;
      strength[effect.area] = beautyIntensity(look, id) / intensityDefaults[effect.area];
      if (effect.area === "contourColor") colors.contourSketch = look.contourSketch;
      if (effect.area === "lipColor") colors.lipFinish = look.finishes?.[id] ?? "Satin";
    }
  }
  return colors;
}

export function addBeautyPiece(ids: string[], id: string) {
  if (ids.includes(id)) return ids;
  const effect = effects[id];
  return [...ids.filter((itemId) => !effect || effects[itemId]?.area !== effect.area), id];
}

export function beautyLookLabel(id: string) {
  return makeupItems.find(({ productId }) => productId === id)?.label ?? getLookProduct(id).name;
}
