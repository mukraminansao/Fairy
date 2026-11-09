import scenes from "../../data/scenes.json";
import presets from "../../data/look-presets.json";
import { products } from "./catalog";

export const fashionHref = "/looks/monochrome-street";
export const fittingHref = "/studio/fashion";
export const mannequinImage = {
  src: "/assets/fashion/monochrome-mannequin.webp", width: 941, height: 1671,
};
const scene = scenes.scenes.find(({ id }) => id === "monochrome-street");
if (!scene) throw new Error("The Monochrome Street scene fixture is missing.");
export const fashionScene = scene;
export const defaultPendant = fashionScene.defaultSelectedProductId;

const paths: Record<string, string> = {
  "f-jacket": "M155 178 185 163 271 161 309 193 361 225 390 266 433 413 426 475 393 508 371 514 342 557 296 549 270 506 278 428 282 345 274 278 255 231 179 217 179 263 193 311 190 389 171 486 145 549 109 558 65 538 41 503 26 464 24 411 53 306 76 248 112 213Z",
  "f-tee": "M178 194 208 204 246 204 274 197 270 226 275 281 282 345 273 433 269 487 295 520 253 528 202 523 174 506 180 449 188 389 194 312 179 253Z",
  "f-pants": "M146 520 197 521 243 531 287 525 333 544 339 589 358 630 363 683 377 748 389 770 383 791 379 835 376 892 383 940 389 1007 376 1052 345 1080 302 1060 262 1073 241 1044 225 991 219 894 202 927 197 992 190 1044 162 1084 124 1071 97 1040 86 1007 96 959 95 903 88 868 95 804 103 771 93 725 102 669 117 600 129 557Z",
  "f-shoes": "M127 1063 152 1053 175 1059 211 1071 205 1109 183 1140 153 1156 123 1154 110 1138 109 1112Z M272 1070 311 1055 337 1063 356 1090 367 1127 355 1151 327 1159 298 1153 280 1137 266 1113Z",
  "f-headphones": "M467 289 473 239 491 195 519 167 554 154 591 156 614 174 625 205 625 242 637 264 630 305 604 334 576 333 562 315 564 278 589 248 603 222 603 196 591 178 562 175 537 187 514 212 499 249 525 254 545 278 551 305 543 330 523 339 498 328 479 312Z",
  "f-sunglasses": "M456 379 Q468 358 504 363 Q560 365 596 390 L680 402 Q698 406 696 421 L628 432 Q600 463 561 459 L513 447 478 431Z",
  "f-bracelet": "M439 523 Q450 496 510 495 Q557 497 566 523 Q571 547 541 562 Q505 572 464 560 Q438 550 439 523Z",
  "f-rings": "M445 597 Q452 579 475 581 Q493 584 497 601 L483 625 459 625 444 615Z M517 582 Q532 569 557 573 Q583 577 581 595 L567 608 538 610 519 600Z",
  "f-pendant": "M598 486 606 483 621 523 638 565 643 581 654 558 666 525 680 485 688 486 676 529 663 567 648 602 650 616 652 659 627 660 626 615 634 607 631 590 619 561Z",
  "f-watch": "M466 639 496 636 514 650 514 665 527 686 528 719 510 743 508 774 453 776 450 746 435 723 434 692 448 674 450 653Z",
  "f-lighter": "M553 684 Q579 675 608 680 L613 763 Q585 775 552 766Z",
  "f-bag": "M459 835 478 799 499 791 518 801 529 839 546 852 558 879 564 913 578 943 570 984 554 1016 523 1035 471 1032 439 1028 412 1012 419 988 414 962 434 915 435 880Z",
};

export const fashionItems = fashionScene.hotspots.flatMap((spot) => {
  const product = products.find(({ id }) => id === spot.productId);
  return product ? [{ ...spot, product, path: paths[spot.productId] }] : [];
});

export type FashionItem = (typeof fashionItems)[number];
export type PendantColor = "black" | "silver";
export { pendantFinishes } from "./catalog";

const preset = presets.presets.find(({ kind }) => kind === "fashion")?.slots;

export const defaultFashionLook = {
  ids: preset ? [preset.jacket, preset.top, preset.pants, preset.shoes, ...preset.jewelry] : [],
  pendantColor: "black" as PendantColor,
};

const shortNames: Record<string, string> = {
  "f-jacket": "Jacket",
  "f-tee": "Tee",
  "f-pants": "Cargo pants",
  "f-shoes": "Sneakers",
  "f-pendant": "Pendant",
  "f-rose-dress": "Rose satin dress",
  "f-sage-hijab": "Sage chiffon hijab",
  "f-taupe-skirt": "Taupe pleated skirt",
};

export function lookItemName(id: string) {
  return shortNames[id] ?? products.find((product) => product.id === id)?.name ?? id;
}

export function getFashionItem(id: string | null | undefined) {
  return fashionItems.find((item) => item.productId === id) ??
    fashionItems.find((item) => item.productId === defaultPendant) ?? fashionItems[0];
}



const replacements: Record<string, readonly string[]> = {
  "f-rose-dress": ["f-jacket", "f-tee", "f-ivory-blouse", "f-pants", "f-taupe-skirt"],
  "f-taupe-skirt": ["f-pants", "f-rose-dress"],
  "f-pants": ["f-taupe-skirt", "f-rose-dress"],
  "f-jacket": ["f-rose-dress"],
  "f-tee": ["f-rose-dress", "f-ivory-blouse"],
  "f-ivory-blouse": ["f-rose-dress", "f-tee"],
};

const exclusiveSlots = [
  ["f-shoes", "f-rose-heels", "f-taupe-flats"],
  ["f-watch", "f-gold-watch", "f-emerald-watch"],
  ["f-rings", "f-pearl-ring", "f-knot-ring"],
  ["f-bracelet", "f-tennis-bracelet", "f-silver-cuff"],
  ["f-sunglasses", "f-rose-glasses", "f-olive-glasses"],
  ["f-pendant", "f-pearl-necklace", "f-crescent-necklace"],
  ["f-bag", "f-rose-clutch", "f-ivory-handbag"],
];

export function addFashionPiece(ids: string[], id: string) {
  if (ids.includes(id)) return ids;
  const conflicts = replacements[id] ?? exclusiveSlots.find((slot) => slot.includes(id)) ?? [];
  return [...ids.filter((itemId) => !conflicts.includes(itemId)), id];
}

const frontOnly = new Set([
  "f-pendant", "f-pearl-necklace", "f-crescent-necklace", "f-sunglasses", "f-rose-glasses", "f-olive-glasses",
  "f-pearl-earrings", "f-pearl-comb", "f-crystal-brooch", "f-hijab-pins",
]);
const coveredByHijab = new Set(["f-pearl-earrings", "f-pearl-comb"]);

const modeledFashionIds = new Set([
  ...defaultFashionLook.ids, ...exclusiveSlots.flat(), "f-rose-dress", "f-sage-hijab", "f-taupe-skirt", "f-ivory-blouse",
  "f-pearl-earrings", "f-pearl-comb", "f-crystal-brooch", "f-hijab-pins", "f-headphones", "f-champagne-stole", "f-woven-belt",
]);

export function isFashionPieceVisible(id: string, ids: readonly string[], back: boolean) {
  if (id === "f-bag") return back;
  if (back && frontOnly.has(id)) return false;
  const hijab = ids.includes("f-sage-hijab");
  if (id === "f-hijab-pins") return hijab;
  return modeledFashionIds.has(id) && (!hijab || !coveredByHijab.has(id));
}

export const emptyFashionLook = { ...defaultFashionLook, ids: [] as string[] };

const needsVisibleHands = new Set([...exclusiveSlots[1], ...exclusiveSlots[2], ...exclusiveSlots[3], "f-rose-clutch", "f-ivory-handbag"]);
export function usesVisibleHands(ids: readonly string[]) {
  return ids.some((id) => needsVisibleHands.has(id));
}
