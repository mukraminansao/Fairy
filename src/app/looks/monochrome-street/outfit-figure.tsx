"use client";

import { useEffect, useId, useRef } from "react";
import { isFashionPieceVisible, lookItemName, mannequinImage, usesVisibleHands } from "../../fashion-data";
import type { FashionLook } from "../../shop-state";
import { FashionFootwear, OutfitAccessories } from "./outfit-accessories";
import { PhotoAccessory } from "./photo-accessory";
import styles from "./fashion.module.css";

const wardrobePath = "/assets/fashion/wardrobe/";
const base = wardrobePath + "base.webp";
const tee = wardrobePath + "tee.webp";
const jacket = wardrobePath + "jacket.webp";
const jacketAndTee = wardrobePath + "jacket-and-tee.webp";
const { src: dressed, width, height } = mannequinImage;

// These contours follow the cuffs in the approved front-view outfit image.
const shoesOutline = "M314 1554 Q325 1520 357 1513 Q391 1503 414 1536 L431 1576 Q439 1604 426 1625 L411 1629 L409 1646 Q375 1661 304 1651 Q294 1638 305 1606Z M510 1539 Q532 1508 567 1512 Q603 1510 620 1545 L634 1598 Q646 1622 640 1647 Q588 1663 525 1650 L516 1632 L502 1626 Q492 1590 510 1539Z";
const pantWaist = "M0 806H279Q290 769 331 748H374Q474 779 566 747H613Q646 762 660 806";
const cuffEdge = "H941V1545H684Q652 1572 628 1560L606 1529Q565 1506 534 1531L509 1561Q486 1568 468 1546H449Q432 1567 413 1561L399 1531Q365 1510 334 1532L310 1563Q283 1566 258 1545H0Z";
const teeWithoutPants = "M0 0H941V735H682Q667 767 651 784L640 765L618 730Q466 778 317 732L296 768L285 785Q274 753 262 735H0Z";
const topWithoutPants = "M0 0H941V725H716L683 762L661 799L645 792L625 757L584 774L566 749Q472 770 375 741L353 768L309 759L281 800L268 785L252 747L222 725H0Z";

const frontArt = {
  base, dressed, tee, jacket, jacketAndTee,
  waist: pantWaist, cuffs: cuffEdge, shoes: shoesOutline,
  teeCut: teeWithoutPants, jacketCut: topWithoutPants,
};
const hijabFrontMask = "M336 0H716V479H683Q680 449 665 434Q646 423 621 421Q606 420 609 410Q602 400 577 395Q546 386 520 382Q474 377 447 362Q403 344 378 312L365 287L336 287Z";
const hijabBackMask = "M344 0H684V429H663Q660 411 641 407L593 408Q543 401 515 378L494 358Q442 342 408 314L382 287H344Z";
const jacketOpening = "M425 269Q469 280 518 267L508 311Q493 344 496 390L507 597H433Q441 503 445 381Q446 329 425 291Z";
const rearSling = wardrobePath + "rear-sling.webp";
const rearDressed = wardrobePath + "rear-dressed.webp";
const rearCut = "M0 0H941V727H716Q689 765 657 792L630 758Q470 777 311 754L283 788Q251 760 226 727H0Z";
const rearArt = {
  base: wardrobePath + "rear-base.webp",
  dressed: rearDressed,
  tee: wardrobePath + "rear-tee.webp",
  jacket: rearDressed,
  jacketAndTee: rearDressed,
  waist: "M0 812H274Q293 775 331 751H610Q641 771 667 812",
  cuffs: "H941V1551H673Q649 1580 622 1566Q572 1534 523 1568Q492 1585 467 1554H452Q431 1584 408 1566Q369 1534 326 1565Q298 1580 266 1551H0Z",
  shoes: "M305 1581Q323 1552 354 1549Q398 1543 419 1566L434 1602L432 1649Q370 1668 299 1649Z M505 1592Q525 1551 564 1549Q611 1547 626 1579L635 1648Q581 1667 499 1648Z",
  teeCut: rearCut,
  jacketCut: rearCut,
};

function Artwork({ src }: { src: string }) {
  return <image href={src} width={width} height={height} />;
}

function BaseArtwork({ src, back }: { src: string; back: boolean }) {
  const id = useId();
  if (!back) return <Artwork src={src} />;

  return (
    <g>
      <defs>
        <clipPath id={id + "-upper"}><rect width={width} height={805} /></clipPath>
        <clipPath id={id + "-left"}><rect y="805" width={width / 2} height={height - 805} /></clipPath>
        <clipPath id={id + "-right"}><rect x={width / 2} y="805" width={width / 2} height={height - 805} /></clipPath>
      </defs>
      <g clipPath={"url(#" + id + "-upper)"}><Artwork src={src} /></g>
      {/* Align the rear neutral feet to the sneaker stance. */}
      <g transform="matrix(1 0 -.08 1 64.4 0)" clipPath={"url(#" + id + "-left)"}><Artwork src={src} /></g>
      <g transform="matrix(1 0 .08 1 -64.4 0)" clipPath={"url(#" + id + "-right)"}><Artwork src={src} /></g>
    </g>
  );
}

function RelaxedOutfit({ back, dress, shoes, footwear, tee, jacket, blouse }: {
  back: boolean; dress: boolean; shoes: boolean; footwear?: string; tee: boolean; jacket: boolean; blouse: boolean;
}) {
  const id = useId();
  const side = back ? "back" : "front";
  const garment = dress ? "dress-elegant" : jacket ? "skirt-jacket" : blouse ? "sage-blouse" : tee ? "skirt-tee" : "skirt-elegant";
  const art = back ? rearArt : frontArt;
  const source = wardrobePath + garment + "-" + side + ".webp";
  const hem = dress && !back ? 1520 : 1555;
  const hasFootwear = shoes || footwear !== undefined;
  const ankleEnd = footwear ? 1610 : 1590;

  return (
    <g data-worn-piece={dress ? "f-rose-dress" : "f-taupe-skirt"} data-mannequin-pose="relaxed">
      <defs>
        <clipPath id={id + "-hem"}><rect width={width} height={hem} /></clipPath>
        <clipPath id={id + "-ankles"}><rect y={hem} width={width} height={ankleEnd - hem} /></clipPath>
        <clipPath id={id + "-shoes"}><path d={art.shoes} /></clipPath>
        <clipPath id={id + "-left"}><rect width={width / 2} height={height} /></clipPath>
        <clipPath id={id + "-right"}><rect x={width / 2} width={width / 2} height={height} /></clipPath>
        <clipPath id={id + "-opening"}><path d={jacketOpening} /></clipPath>
      </defs>
      {hasFootwear && <g clipPath={"url(#" + id + "-ankles)"}><Artwork src={source} /></g>}
      {shoes && (
        <>
          <g transform={back ? "matrix(.64 0 0 1 200 0)" : "matrix(.82 0 0 1 89 0)"} clipPath={"url(#" + id + "-left)"}>
            <g clipPath={"url(#" + id + "-shoes)"}><Artwork src={art.dressed} /></g>
          </g>
          <g transform={back ? "matrix(.64 0 0 1 143 0)" : "matrix(.82 0 0 1 67 0)"} clipPath={"url(#" + id + "-right)"}>
            <g clipPath={"url(#" + id + "-shoes)"}><Artwork src={art.dressed} /></g>
          </g>
        </>
      )}
      {footwear && <FashionFootwear product={footwear} back={back} pose={dress ? "dress" : "skirt"} />}
      <g clipPath={hasFootwear ? "url(#" + id + "-hem)" : undefined}><Artwork src={source} /></g>
      {!back && !dress && jacket && (tee || blouse) && (
        <g clipPath={"url(#" + id + "-opening)"}><Artwork src={wardrobePath + (blouse ? "sage-blouse-front.webp" : "skirt-tee-front.webp")} /></g>
      )}
    </g>
  );
}

function RelaxedStreet({ back, jacket, tee, blouse, pants, shoes, footwear }: {
  back: boolean; jacket: boolean; tee: boolean; blouse: boolean; pants: boolean; shoes: boolean; footwear?: string;
}) {
  const id = useId();
  const side = back ? "back" : "front";
  const full = wardrobePath + "street-hands-" + side + ".webp";
  const neutral = wardrobePath + "neutral-hands-" + side + ".webp";
  const top = blouse ? wardrobePath + "sage-blouse-" + side + ".webp"
    : tee ? wardrobePath + "skirt-tee-" + side + ".webp" : neutral;
  return (
    <g data-mannequin-pose="hands-visible">
      <defs>
        <clipPath id={id + "-upper"}><path d="M0 0H941V1030H632V740H309V1030H0Z" /></clipPath>
        <clipPath id={id + "-top"}><path d="M0 0H941V1010H665Q642 845 599 625L580 586H361L343 632Q308 832 285 1010H0Z" /></clipPath>
        <clipPath id={id + "-tee-torso"}><path d="M353 474Q468 488 585 474L620 739Q467 770 318 739Z" /></clipPath>
        <clipPath id={id + "-trousers"}><path d="M320 736H621L674 834L732 1529Q696 1556 635 1549H506L471 1480L431 1552H266Q239 1547 230 1529L270 832Z" /></clipPath>
        <clipPath id={id + "-sneakers"}><path d={(back ? rearArt : frontArt).shoes} /></clipPath>
        <clipPath id={id + "-without-feet"}><rect width={width} height="1590" /></clipPath>
        <clipPath id={id + "-tee-opening"}><path d="M416 270H525L517 351L539 733H399L428 351Z" /></clipPath>
      </defs>
      {jacket && tee && pants && shoes ? <Artwork src={full} /> : (
        <>
          <g clipPath={footwear || shoes ? "url(#" + id + "-without-feet)" : undefined}><Artwork src={neutral} /></g>
          {pants && <g clipPath={"url(#" + id + "-trousers)"}><Artwork src={full} /></g>}
          {shoes && <g clipPath={"url(#" + id + "-sneakers)"}><Artwork src={back ? rearArt.dressed : dressed} /></g>}
          {footwear && <FashionFootwear product={footwear} back={back} pose="street" />}
          {(jacket || tee || blouse) && <g clipPath={"url(#" + id + (jacket ? "-upper)" : "-top)")}>
            <Artwork src={jacket ? full : top} />
          </g>}
          {tee && !jacket && <g clipPath={"url(#" + id + "-tee-torso)"}>
            <Artwork src={(back ? rearArt : frontArt).tee} />
          </g>}
          {!back && jacket && (!tee || blouse) && <g clipPath={"url(#" + id + "-tee-opening)"}><Artwork src={top} /></g>}
        </>
      )}
    </g>
  );
}

export type OutfitView = "front" | "back";
export type OutfitDetail = "full" | "head" | "hands";

const garmentHighlights: Readonly<Record<string, string>> = {
  "f-jacket": "top", "f-tee": "top", "f-ivory-blouse": "top",
  "f-pants": "pants", "f-taupe-skirt": "pants", "f-shoes": "shoes", "f-rose-dress": "dress",
};

export function OutfitFigure({ look, view = "front", detail = "full" }: { look: FashionLook; view?: OutfitView; detail?: OutfitDetail }) {
  const id = useId();
  const figure = useRef<SVGSVGElement>(null);
  const previous = useRef({ look, view });
  useEffect(() => {
    const last = previous.current;
    previous.current = { look, view };
    const svg = figure.current;
    if (!svg?.getClientRects().length || last.view !== view || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const changed = look.ids.filter((piece) => !last.look.ids.includes(piece) ||
      (piece === "f-pendant" && last.look.pendantColor !== look.pendantColor));
    if (!changed.length) return;
    const regions = new Set(changed.map((piece) => garmentHighlights[piece]));
    const timing = { duration: 230, easing: "ease-out" };
    const animations: Animation[] = [];
    svg.querySelectorAll<SVGElement>("[data-worn-piece]").forEach((layer) => {
      const piece = layer.dataset.wornPiece!;
      if (changed.includes(piece) && !garmentHighlights[piece]) {
        animations.push(layer.animate([{ opacity: .38 }, { opacity: 1 }], timing));
      }
    });
    svg.querySelectorAll<SVGElement>("[data-outfit-highlight]").forEach((layer) => {
      const region = layer.dataset.outfitHighlight;
      if (region && regions.has(region)) {
        animations.push(layer.animate([{ opacity: .85 }, { opacity: 0 }], timing));
      }
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [look, view]);
  const back = view === "back";
  const art = back ? rearArt : frontArt;
  const hasJacket = look.ids.includes("f-jacket");
  const hasTee = look.ids.includes("f-tee");
  const hasPants = look.ids.includes("f-pants");
  const hasShoes = look.ids.includes("f-shoes");
  const footwear = look.ids.find((itemId) => itemId === "f-rose-heels" || itemId === "f-taupe-flats");
  const hasBlouse = look.ids.includes("f-ivory-blouse");
  const hasPendant = !back && look.ids.includes("f-pendant");
  const hasSling = back && look.ids.includes("f-bag");
  const hasDress = look.ids.includes("f-rose-dress");
  const hasHijab = look.ids.includes("f-sage-hijab");
  const hasSkirt = look.ids.includes("f-taupe-skirt");
  const hands = usesVisibleHands(look.ids) || detail === "hands" || hasBlouse || footwear !== undefined;
  const pieces = look.ids.filter((itemId) => isFashionPieceVisible(itemId, look.ids, back)).map(lookItemName);
  const label = (back ? "2D mannequin back view" : "2D mannequin") +
    (pieces.length ? " wearing " + pieces.join(", ") : " in its neutral base layer");
  const top = hasJacket ? (hasTee ? art.jacketAndTee : art.jacket) : (hasTee ? art.tee : null);
  const completeClothing = hasPants ? top : null;
  const viewBox = detail === "head" ? "317 0 306 480" : detail === "hands" ? "140 746 660 370" : "0 0 " + width + " " + height;

  return (
    <svg ref={figure} className={styles.outfitFigure} role="img" aria-label={label} viewBox={viewBox}>
      <defs>
        <clipPath id={id + "-pants"}><path d={art.waist + (hasShoes ? "H941V1671H0Z" : art.cuffs)} /></clipPath>
        <clipPath id={id + "-shoes"}><path d={art.shoes} /></clipPath>
        <clipPath id={id + "-without-shoes"}><path d={"M0 0" + art.cuffs} /></clipPath>
        <clipPath id={id + "-feet"}><rect y="1450" width={width} height={221} /></clipPath>
        <clipPath id={id + "-base-lower"}><rect y="730" width={width} height={941} /></clipPath>
        <clipPath id={id + "-torso"}><path d={hasJacket ? art.jacketCut : art.teeCut} /></clipPath>
        <clipPath id={id + "-highlight-top"}><rect x="215" y="245" width="510" height="535" /></clipPath>
        <clipPath id={id + "-highlight-pants"}><rect x="230" y="745" width="505" height="804" /></clipPath>
        <clipPath id={id + "-highlight-dress"}><rect x="240" y="260" width="465" height="1295" /></clipPath>
      </defs>
      <g id={id + "-body"}>
        {hasDress || hasSkirt ? (
          <RelaxedOutfit back={back} dress={hasDress} shoes={hasShoes} footwear={footwear} tee={hasTee} jacket={hasJacket} blouse={hasBlouse} />
        ) : hands ? (
          <RelaxedStreet back={back} jacket={hasJacket} tee={hasTee} blouse={hasBlouse} pants={hasPants} shoes={hasShoes} footwear={footwear} />
        ) : completeClothing ? (
          <>
            {!hasShoes && <g clipPath={"url(#" + id + "-feet)"}><BaseArtwork src={art.base} back={back} /></g>}
            <g clipPath={hasShoes ? undefined : "url(#" + id + "-without-shoes)"}>
              <Artwork src={completeClothing} />
            </g>
          </>
        ) : (
          <>
            <g clipPath={top ? "url(#" + id + "-base-lower)" : undefined}><BaseArtwork src={art.base} back={back} /></g>
            {hasPants && <g clipPath={"url(#" + id + "-pants)"}><Artwork src={art.dressed} /></g>}
            {hasShoes && <g clipPath={"url(#" + id + "-shoes)"}><Artwork src={art.dressed} /></g>}
            {top && <g clipPath={"url(#" + id + "-torso)"}><Artwork src={top} /></g>}
          </>
        )}
      </g>
      {/* Reuse the artwork so the highlight can fade without dimming the mannequin. */}
      {["top", "pants", "dress", "shoes"].map((region) => (
        <g key={region} data-outfit-highlight={region} opacity="0" aria-hidden="true"
          clipPath={"url(#" + id + (region === "shoes" ? "-shoes)" : "-highlight-" + region + ")")}>
          <use href={"#" + id + "-body"} className={styles.garmentHighlight} />
        </g>
      ))}
      {back && !hands && hasJacket && !hasTee && !hasSkirt && (
        <path d="M332 751Q468 760 606 751L605 761Q469 771 333 760Z"
          fill={hasPants ? "#252321" : "#d6cec3"} />
      )}
      {hasHijab && (
        <g data-worn-piece="f-sage-hijab">
          <clipPath id={id + "-hijab"}><path d={back ? hijabBackMask : hijabFrontMask} /></clipPath>
          <g clipPath={"url(#" + id + "-hijab)"}>
            <Artwork src={wardrobePath + (back ? "hijab-back.webp" : "hijab-front.webp")} />
          </g>
        </g>
      )}
      {hasPendant && (
        <g data-worn-piece="f-pendant" aria-hidden="true">
          <PhotoAccessory product="f-pendant-chain" frame={[414, 272, 112, 109]} shadow={false} />
          <PhotoAccessory product="f-pendant" frame={[455, 367, 31, 70]} silverFinish={look.pendantColor === "silver"} />
        </g>
      )}
      <OutfitAccessories ids={look.ids} back={back} pose={hasDress ? "dress" : hasSkirt ? "skirt" : "street"} streetJacket={hasJacket} />
      {hasSling && (
        <g data-worn-piece="f-bag">
          <path d="M355 280Q410 341 497 415 M574 642Q609 673 634 698" fill="none" stroke="#151413" strokeWidth="37" strokeLinecap="round" />
          <path d="M345 289Q401 354 487 427 M565 654Q600 685 623 707" fill="none" stroke="#373330" strokeWidth="3" />
          <image href={rearSling} x="406" y="391" width="231" height="306" transform="rotate(-11 522 544)" />
        </g>
      )}
    </svg>
  );
}
