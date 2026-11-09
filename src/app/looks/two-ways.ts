import { defaultFashionLook } from "../fashion-data";
import type { LookSet } from "../look-sets";

export const twoWaysHref = "/looks/one-piece-two-ways";
export const twoWaysTitle = "One Piece, Two Ways";

const dress = "f-rose-dress";
export const twoWays = [
  {
    id: "day", label: "Day Out",
    note: "Pair the rose satin dress with taupe bow flats, an ivory top-handle bag, and a silver crescent necklace.",
    look: { ...defaultFashionLook, ids: [dress, "f-taupe-flats", "f-ivory-handbag", "f-crescent-necklace"] },
  },
  {
    id: "evening", label: "Evening",
    note: "Swap the flats for champagne slingbacks, then finish with a rose satin clutch and a pearl solitaire.",
    look: { ...defaultFashionLook, ids: [dress, "f-rose-heels", "f-rose-clutch", "f-pearl-necklace"] },
  },
];

export function twoWaysAvailable(sets: readonly LookSet[]) {
  const items = new Set(sets.flatMap(({ itemIds }) => itemIds));
  return twoWays.every(({ look }) => look.ids.every((id) => items.has(id)));
}
