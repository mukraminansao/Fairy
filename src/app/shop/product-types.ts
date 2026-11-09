const labels: Record<string, string> = {
  jacket: "Jackets", top: "Tops", pants: "Pants & skirts", shoes: "Shoes", dress: "Dresses",
  headwear: "Hijabs & headwear", wrap: "Wraps", bag: "Bags", necklace: "Necklaces & pendants",
  bracelet: "Bracelets", watch: "Watches", earrings: "Earrings", ring: "Rings", glasses: "Sunglasses",
  belt: "Belts", headpiece: "Hair accessories", "scarf-pins": "Scarf pins", pin: "Brooches", headphones: "Headphones",
  lips: "Lip products", eyes: "Eyeshadow", cheeks: "Blush", skin: "Foundation & concealer", brows: "Brows",
  lashes: "Lashes", contour: "Contour", eyeliner: "Eyeliner", tools: "Makeup tools",
  serum: "Serums", cream: "Creams", essence: "Essences", perfume: "Perfume",
};

const knownTypes: Record<string, string> = {
  "f-pendant": "necklace", "f-bracelet": "bracelet", "f-rings": "ring", "f-watch": "watch", "f-bag": "bag",
  "f-sunglasses": "glasses", "f-headphones": "headphones", "b-serum": "serum", "b-cream": "cream",
  "b-essence": "essence", "b-fragrance": "perfume",
};

export function productType({ id, name, category, tryOnSlot }: { id: string; name: string; category: string; tryOnSlot: string | null }) {
  const type = knownTypes[id] ?? tryOnSlot;
  if (type && Object.hasOwn(labels, type)) return { id: type, label: labels[type] };
  if (category === "makeup" && /brush|puff|sponge|applicator/i.test(name)) return { id: "tools", label: labels.tools };
}
