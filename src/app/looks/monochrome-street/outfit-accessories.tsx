import { useId } from "react";
import { PhotoAccessory } from "./photo-accessory";

export type OutfitPose = "street" | "dress" | "skirt";
type AccessoriesProps = { ids: readonly string[]; back: boolean; pose: OutfitPose; streetJacket: boolean };

const wrists = {
  jacket: { front: [701, 238], back: [239, 694], y: 846, finger: 74 },
  street: { front: [669, 258], back: [273, 664], y: 835, finger: 73 },
  dress: { front: [667, 266], back: [281, 667], y: 833, finger: 66 },
  skirt: { front: [673, 273], back: [282, 666], y: 850, finger: 65 },
};

export function FashionFootwear({ product, back, pose }: { product: string; back: boolean; pose: OutfitPose }) {
  const id = useId();
  const heels = product === "f-rose-heels";
  const centers = back ? [426, 508] : pose === "street" ? [375, 566] : [383, 538];

  return (
    <g data-worn-piece={product}>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={heels ? "#f5deb7" : "#b89d83"} />
          <stop offset=".65" stopColor={heels ? "#d3ab73" : "#9b8068"} />
          <stop offset="1" stopColor={heels ? "#a67b50" : "#665344"} />
        </linearGradient>
      </defs>
      {centers.map((x) => (
        <g key={x} transform={`translate(${x} ${back ? 1593 : 1602})`}>
          {back && heels && <path d="M-8 18H8L5 47H-4Z" fill="#8d633e" />}
          <path d={back
            ? "M-36 -5Q-40 9 -35 30Q-29 41 0 40Q27 42 35 30Q39 11 35 -5Q26 5 0 6Q-28 6 -36 -5Z"
            : heels
              ? "M-34 -15Q-39 0 -37 20Q-31 35 0 48Q31 37 37 20Q39 0 34 -15Q28 5 0 7Q-26 5 -34 -15Z"
              : "M-35 -14Q-38 2 -36 25Q-29 45 0 45Q29 45 36 25Q39 1 35 -14Q26 7 0 9Q-25 7 -35 -14Z"}
            fill={"url(#" + id + ")"} stroke={heels ? "#99714a" : "#75604c"} strokeWidth="2" />
          <path d={back ? "M-33 23Q0 34 33 23" : "M-34 20Q0 41 34 20"} fill="none" stroke={heels ? "#f6dfbb" : "#c7ae93"} strokeWidth="3" />
          {!back && !heels && <path d="M0 18C-11 6-25 9-18 17Q-12 24 0 18C11 6 25 9 18 17Q12 24 0 18L-7 28M0 18L7 28" fill="none" stroke="#795f4a" strokeWidth="3" />}
        </g>
      ))}
    </g>
  );
}

const wornPhotos = "/assets/fashion/wardrobe/accessories/";

const watchBands = {
  "f-watch": "f-watch-band",
  "f-gold-watch": "f-gold-watch-band",
  "f-emerald-watch": "f-emerald-watch-band",
} as const;

function Watch({ product, x, y, back }: {
  product: keyof typeof watchBands; x: number; y: number; back: boolean;
}) {
  const black = product === "f-watch";
  const gold = product === "f-gold-watch";
  const band = black ? 23 : 17;
  const span = back ? 41 : gold ? 44 : 48;
  const dialWidth = gold ? 28 : 40;
  const dialHeight = gold ? 41 : 40;
  return (
    <g data-worn-piece={product} transform={`translate(${x} ${y}) rotate(${back ? -8 : 8})`}>
      <PhotoAccessory product={watchBands[product]} frame={[-band / 2, -span / 2, band, span]} transform="rotate(90)" />
      {!back && <PhotoAccessory product={product} frame={[-dialWidth / 2, -dialHeight / 2, dialWidth, dialHeight]} />}
    </g>
  );
}

export function OutfitAccessories({ ids, back, pose, streetJacket }: AccessoriesProps) {
  const rearHeadphoneClip = useId();
  const has = (product: string) => ids.includes(product);
  const hijab = has("f-sage-hijab");
  const headphones = has("f-headphones");
  const glasses = (["f-sunglasses", "f-rose-glasses", "f-olive-glasses"] as const).find(has);
  const necklace = (["f-pearl-necklace", "f-crescent-necklace"] as const).find(has);
  const watch = (["f-watch", "f-gold-watch", "f-emerald-watch"] as const).find(has);
  const bracelet = (["f-bracelet", "f-tennis-bracelet", "f-silver-cuff"] as const).find(has);
  const ring = (["f-rings", "f-pearl-ring", "f-knot-ring"] as const).find(has);
  const bag = (["f-rose-clutch", "f-ivory-handbag"] as const).find(has);
  const wrist = wrists[pose === "street" && streetJacket ? "jacket" : pose];
  const [watchX, otherX] = back ? wrist.back : wrist.front;
  const wristY = wrist.y;
  const braceletWidth = bracelet === "f-silver-cuff" ? 47 : 51;
  const braceletHeight = bracelet === "f-silver-cuff" ? 17 : 14;
  const ringX = otherX + (back ? -3 : 5);
  const ringY = wristY + wrist.finger;
  const clutch = bag === "f-rose-clutch";
  const bagX = otherX + (back ? 18 : -18);
  const bagY = wristY + (clutch ? 123 : 153);

  return (
    <>
      {has("f-champagne-stole") && <g data-worn-piece="f-champagne-stole">
        {back && <path d="M325 311Q399 274 418 273Q470 314 521 273Q550 281 615 312L619 385Q547 426 470 421Q396 427 321 387Z"
          fill="#edca9a" fillOpacity=".55" stroke="#d6b283" strokeWidth="2" />}
        <path d="M414 273C372 288 334 298 303 333L318 532Q332 573 354 591L374 408Q401 351 429 291ZM522 270C569 289 609 302 643 333L627 532Q613 563 590 590L565 408Q542 340 509 292Z"
          fill="#edca9a" fillOpacity=".63" stroke="#d6b283" strokeWidth="2" />
        <path d="M401 294Q331 346 344 556M539 296Q602 345 600 558" stroke="#f8e2bb" strokeWidth="4" opacity=".68" fill="none" />
      </g>}
      {has("f-woven-belt") && <g data-worn-piece="f-woven-belt" transform={`translate(0 ${pose === "street" ? 740 : 593})`}>
        <path d="M365 0Q470 16 575 0L579 22Q471 39 361 23Z" fill="#bba183" stroke="#87715b" strokeWidth="2" />
        <path d="M367 8Q471 25 574 8M366 15Q469 33 575 15" fill="none" stroke="#e2cdb0" strokeWidth="3" strokeDasharray="5 3" />
        {!back && <ellipse cx="470" cy="23" rx="18" ry="14" fill="none" stroke="#e1dfe0" strokeWidth="5" />}
      </g>}
      {!back && necklace && <g data-worn-piece={necklace}>
        <PhotoAccessory product={necklace} frame={[414, 275, 112, 154]} />
      </g>}
      {!back && !hijab && has("f-pearl-earrings") && <g data-worn-piece="f-pearl-earrings">
        <PhotoAccessory product="f-pearl-earrings" frame={[404, 155, 20, 44]} />
        <PhotoAccessory product="f-pearl-earrings" frame={[514, 155, 20, 44]} mirror />
      </g>}
      {!back && !hijab && has("f-pearl-comb") && <g data-worn-piece="f-pearl-comb">
        <PhotoAccessory product="f-pearl-comb" frame={[514, 63, 40, 34]} transform="rotate(48 534 80)" />
      </g>}
      {!back && hijab && has("f-hijab-pins") && <g data-worn-piece="f-hijab-pins">
        <PhotoAccessory product="f-hijab-pins" frame={[546, 322, 16, 16]} />
        <PhotoAccessory product="f-hijab-pins" frame={[563, 333, 16, 16]} />
      </g>}
      {!back && has("f-crystal-brooch") && <g data-worn-piece="f-crystal-brooch">
        <PhotoAccessory product="f-crystal-brooch" frame={[544, 363, 36, 36]} />
      </g>}
      {headphones && <g data-worn-piece="f-headphones">
        {back && <clipPath id={rearHeadphoneClip}>
          <path d="M363 0H578V210H531V187C523 165 521 141 528 118Q532 103 538 90H404Q411 103 415 118C422 141 418 165 410 187V210H363Z" />
        </clipPath>}
        <image href={wornPhotos + (back ? "headphones-back.webp" : "headphones-front.webp")} x={hijab ? 369 : 376} y="13"
          width={hijab ? 203 : 189} height="174" preserveAspectRatio="none"
          clipPath={back ? "url(#" + rearHeadphoneClip + ")" : undefined} />
      </g>}
      {!back && glasses && <g data-worn-piece={glasses}>
        {glasses === "f-sunglasses"
          ? <image href={wornPhotos + "sunglasses-front.webp"} x="395" y="108" width="148" height="36" preserveAspectRatio="none" />
          : <PhotoAccessory product={glasses} frame={glasses === "f-rose-glasses" ? [398, 111, 144, 35] : [397, 109, 145, 37]} />}
      </g>}
      {watch && <Watch product={watch} x={watchX} y={wristY + (back ? 3 : 0)} back={back} />}
      {bracelet && <g data-worn-piece={bracelet} transform={`translate(${otherX} ${wristY + 10}) rotate(${back ? 7 : -7})`}>
        <PhotoAccessory product={bracelet} frame={[-braceletWidth / 2, -braceletHeight / 2, braceletWidth, braceletHeight]} />
      </g>}
      {ring && <g data-worn-piece={ring} transform={`translate(${ringX} ${ringY}) rotate(${back ? 14 : -14})`}>
        <PhotoAccessory product={ring} frame={ring === "f-rings" ? [-8, -9, 15, 16] : [-11, -9, 22, 15]} />
        {ring === "f-rings" && <PhotoAccessory product="f-rings-band" frame={[7, 0, 12, 10]} />}
      </g>}
      {bag && <g data-worn-piece={bag} transform={`translate(${bagX} ${bagY}) rotate(${back ? 7 : -7})`}>
        <PhotoAccessory product={bag} frame={clutch ? [-76, -48, 152, 81] : [-65, -83, 130, 157]} mirror={back} />
      </g>}
    </>
  );
}
