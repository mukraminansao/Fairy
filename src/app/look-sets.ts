import scenes from "../../data/scenes.json";
import { products } from "./catalog";

type Scene = (typeof scenes.scenes)[number];

export type LookSet = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageSize: readonly [number, number];
  photoCrop?: readonly [number, number];
  hotspots: readonly { productId: string; rect: readonly [number, number, number, number]; shape: string; priority: number }[];
  itemIds: readonly string[];
  defaultItemId: string;
};

function lookSet(scene: Scene): LookSet {
  return {
    id: scene.id,
    title: scene.title,
    description: scene.subtitle,
    image: scene.image,
    imageSize: scene.imageSize as [number, number],
    photoCrop: ("photoCrop" in scene ? scene.photoCrop : undefined) as [number, number] | undefined,
    hotspots: scene.hotspots.map((spot) => {
      const rect = spot.rect as [number, number, number, number];
      const [x, y, width, height] = rect;
      const shape = ("shape" in spot ? spot.shape : undefined) ?? `M${x} ${y}h${width}v${height}h-${width}Z`;
      return { productId: spot.productId, rect, shape, priority: spot.priority };
    }),
    itemIds: scene.hotspots.map(({ productId }) => productId),
    defaultItemId: scene.defaultSelectedProductId,
  };
}

export const fashionSets = scenes.scenes.filter(({ kind }) => kind === "fashion").map(lookSet);
export const beautySets = scenes.scenes.filter(({ kind }) => kind === "beauty").map(lookSet);

export function getLookSet(sets: readonly LookSet[], id?: string | null) {
  return sets.find((set) => set.id === id) ?? sets[0];
}

export function getSetItemId(set: LookSet, id?: string | null) {
  return id && set.itemIds.includes(id) ? id : set.defaultItemId;
}

export function setHref(href: string, sets: readonly LookSet[], setId: string, itemId?: string) {
  const params = new URLSearchParams();
  if (setId !== sets[0].id) params.set("set", setId);
  if (itemId) params.set("item", itemId);
  return params.size ? href + "?" + params : href;
}

export function setProductHref(href: string, sets: readonly LookSet[], itemId: string) {
  const set = sets.find(({ itemIds }) => itemIds.includes(itemId)) ?? sets[0];
  return setHref(href, sets, set.id, itemId);
}

export function getLookProduct(id: string) {
  return products.find((product) => product.id === id)!;
}

