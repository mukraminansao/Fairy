import { useId } from "react";

type Frame = readonly [x: number, y: number, width: number, height: number];

type PhotoCutout = {
  source?: string;
  crop: Frame;
  silhouette: string;
  fineDetails?: readonly [path: string, width: number][];
  chainLinks?: readonly [x: number, y: number, angle: number][];
};

const catalogPhoto = "/assets/fashion/items/";
const pendantPhoto = "/assets/images/silver_cross_pendant_macro.png";

// Masks use the catalog's square photos normalized to a 200 × 200 coordinate grid.
const accessoryCutouts = {
  "f-pendant": {
    source: pendantPhoto,
    crop: [84, 70, 32, 90],
    silhouette: "M94 73Q95 71 100 71.6Q105 71.4 106 73L104.2 91Q104 94 101 94H97.3Q95.4 94 95.1 91Z M92.9 98V92Q93.4 89 95.9 88.5V90.4Q94.7 91 94.7 98Z M104 88.5Q107.2 89 107.5 92V98H105.5V92Q105.5 91 104 90.4Z M90 98H111Q115.2 98 115.5 103V152Q115.5 157.6 111 158H89.8Q85.1 157.6 85.1 152V103Q85.1 98.4 90 98Z",
  },
  "f-pendant-chain": {
    source: pendantPhoto,
    crop: [57, 0, 87, 81],
    silhouette: "",
    chainLinks: [
      [63.8, 8, -24], [68, 19.4, -24], [72.7, 30.9, -24], [77.1, 42.2, -24], [81.7, 53.4, -26], [86.2, 64.2, -28], [90.9, 74.4, -34],
      [136.2, 8, 24], [131.9, 19.4, 24], [127.5, 30.8, 25], [122.5, 42.1, 25], [118, 53.3, 26], [113.4, 64, 27], [108.8, 74.3, 34],
    ],
    fineDetails: [[
      "M60.4 0L62.8 6M64.9 10L67.1 17M69.4 21.2L71.6 28.4M74 33L76.1 40.1M78.1 44L80.7 51.2M82.7 55.3L85.2 62.3M87.4 66.5L89.6 72.4M92.2 76L95 79M139.5 0L137.1 6M135.2 10L132.9 17M130.7 21.3L128.5 28.5M126.5 33L124.3 40.1M121.5 44L119 51.1M117 55.5L114.6 62M112.4 66.5L110 72.4M107.5 76L104.5 79", 1.75,
    ]],
  },
  "f-pearl-necklace": {
    crop: [34, 0, 132, 172],
    silhouette: "M98 114L105 115L105 134C110 140 114 148 114 156Q113 170 101 172Q89 172 87 159C86 149 92 138 97 134Z",
    fineDetails: [["M36.8 0Q61 51 99 119M164.2 0Q139 53 102 119", 2.2]],
  },
  "f-crescent-necklace": {
    crop: [19, 0, 160, 174],
    silhouette: "M99 123Q107 119 106 132L104 139Q91 147 96 158Q100 171 117 166Q113 175 101 173Q88 170 87 156Q86 146 96 138L97 132Z",
    fineDetails: [["M23.5 0C36 34 65 87 98 125M177 0C158 42 131 92 103 125", 2.4]],
  },
  "f-rose-glasses": {
    crop: [13, 65, 177, 54],
    silhouette: "M14 84H22Q26 70 45 68Q72 61 86 76L90 82Q101 77 113 82Q120 67 146 67Q172 66 180 81L189 82V88H182Q182 106 168 114Q152 122 132 114Q115 107 113 89Q101 83 90 89Q89 108 72 115Q48 123 31 111Q23 103 23 88H14Z",
  },
  "f-olive-glasses": {
    crop: [15, 78, 171, 66],
    silhouette: "M16 82Q43 76 72 78Q81 80 88 87Q101 93 112 87Q121 78 141 78Q169 78 185 82V95L178 100Q176 137 163 142Q142 146 126 140Q117 133 110 106Q101 96 91 105Q84 134 76 140Q60 147 38 141Q24 138 21 98L15 96Z",
  },
  "f-watch": {
    crop: [49, 40, 78, 91],
    silhouette: "M66 51L76 45L90 41L110 42L121 51L126 67V93L119 111L114 123L98 131L74 127L65 117L55 106L49 91L49 73L56 60Z",
  },
  "f-gold-watch": {
    crop: [78, 53, 46, 68],
    silhouette: "M84 57L90 54H109L117 58L118 79L123 83V93L118 95L117 116L112 121H86L80 117V62Z",
  },
  "f-emerald-watch": {
    crop: [68, 58, 65, 63],
    silhouette: "M101 59Q123 59 129 84L133 86V95L129 97Q121 122 99 121Q70 119 69 91Q68 65 101 59Z",
  },
  "f-watch-band": {
    source: catalogPhoto + "f-watch.webp",
    crop: [68, 128, 54, 37],
    silhouette: "M69 128L121 128L117 166L82 166Z",
  },
  "f-gold-watch-band": {
    source: catalogPhoto + "f-gold-watch.webp",
    crop: [86, 119, 26, 67],
    silhouette: "M86 119H112V185H86Z",
  },
  "f-emerald-watch-band": {
    source: catalogPhoto + "f-emerald-watch.webp",
    crop: [88, 120, 24, 61],
    silhouette: "M88 120H112V182H88Z",
  },
  "f-bracelet": {
    crop: [21, 109, 161, 44],
    silhouette: "M21 111L30 108Q44 128 66 132L79 130L85 134H117L121 129Q152 132 172 109L182 114Q165 140 133 144L120 149H80L65 145Q34 139 21 111Z",
  },
  "f-tennis-bracelet": {
    crop: [21, 104, 158, 42],
    silhouette: "M21 107L27 104Q42 129 69 131Q104 140 132 128Q158 121 172 104L179 109Q167 136 132 141Q103 150 73 142Q37 139 21 107Z",
  },
  "f-silver-cuff": {
    crop: [28, 95, 144, 53],
    silhouette: "M28 95Q46 111 83 115Q131 118 172 96L170 121Q164 146 101 148Q53 148 33 134Z",
  },
  "f-rings": {
    crop: [23, 77, 61, 54],
    silhouette: "M25 81Q48 75 68 77L84 87L81 110L66 130L48 129L34 116L22 99Z",
  },
  "f-rings-band": {
    source: catalogPhoto + "f-rings.webp",
    crop: [104, 75, 79, 57],
    silhouette: "M105 88Q106 79 131 76Q157 72 176 85L184 99L182 112Q168 131 144 132Q123 130 107 117Z",
  },
  "f-pearl-ring": {
    crop: [41, 88, 113, 44],
    silhouette: "M41 90Q53 92 72 98Q79 78 97 78Q115 79 124 98Q141 96 154 89L152 106Q135 119 120 119Q111 134 97 134Q81 134 72 119Q48 114 42 103Z",
  },
  "f-knot-ring": {
    crop: [44, 90, 109, 50],
    silhouette: "M44 92Q55 95 68 96Q91 86 110 94Q133 95 154 91Q155 102 142 113L125 119Q112 139 95 137Q77 134 69 121Q50 116 44 104Z",
  },
  "f-pearl-earrings": {
    crop: [47, 52, 47, 104],
    silhouette: "M72 104Q78 104 79 110Q90 115 91 133Q92 149 78 155Q64 157 60 142Q55 123 66 112L71 110Z",
    fineDetails: [["M49 112Q59 106 60 87Q59 52 71 53Q89 48 83 79Q81 88 75 97L74 110", 3.8]],
  },
  "f-pearl-comb": {
    crop: [43, 47, 120, 114],
    silhouette: "M45 68Q52 53 65 62Q73 48 84 53Q99 40 111 53Q128 45 137 63Q152 51 162 68Q164 82 148 89Q102 61 55 91Q44 84 45 68Z",
    fineDetails: [["M54 90Q106 58 151 89M60 89L61 108M71 84L72 104M83 80L84 100M95 77L97 98M108 78L110 99M121 80L123 101M132 83L134 104M142 88L144 108", 3]],
  },
  "f-hijab-pins": {
    crop: [50, 78, 44, 46],
    silhouette: "M72 78A22 23 0 1 1 72 124A22 23 0 1 1 72 78Z",
  },
  "f-crystal-brooch": {
    crop: [46, 37, 111, 105],
    silhouette: "M101 37Q118 47 116 78Q143 62 157 78Q153 95 123 101Q140 115 137 139Q116 141 102 116Q89 141 68 140Q60 121 82 102Q55 101 46 79Q61 64 86 79Q83 49 101 37Z",
  },
  "f-rose-clutch": {
    crop: [16, 64, 167, 87],
    silhouette: "M18 65H178Q183 65 183 70V146Q183 151 179 151H17V71Z",
  },
  "f-ivory-handbag": {
    crop: [27, 12, 146, 165],
    silhouette: "M48 71H151L173 168Q173 175 166 176H35Q28 176 28 167Z",
    fineDetails: [["M63 71Q67 13 103 15Q134 15 139 70", 5]],
  },
} satisfies Record<string, PhotoCutout>;

type PhotoAccessoryId = keyof typeof accessoryCutouts;

export function PhotoAccessory({ product, frame, transform, mirror, silverFinish = false, shadow = true }: {
  product: PhotoAccessoryId; frame: Frame; transform?: string; mirror?: boolean; silverFinish?: boolean; shadow?: boolean;
}) {
  const id = useId();
  const cutout: PhotoCutout = accessoryCutouts[product];
  const [x, y, width, height] = frame;
  const [sx, , sourceWidth] = cutout.crop;
  return (
    <svg x={x} y={y} width={width} height={height} viewBox={cutout.crop.join(" ")} preserveAspectRatio="none"
      transform={transform} overflow="visible" style={shadow ? { filter: "drop-shadow(0 1px 1px #23191142)" } : undefined}>
      <defs>
        <mask id={id} x="0" y="0" width="200" height="200" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }}>
          {cutout.silhouette && <path d={cutout.silhouette} fill="white" />}
          {cutout.fineDetails?.map(([path, thickness]) => (
            <path key={path} d={path} stroke="white" strokeWidth={thickness} strokeLinecap="round" fill="none" />
          ))}
          {cutout.chainLinks?.map(([cx, cy, angle]) => (
            <ellipse key={cx} cx={cx} cy={cy} rx="3.05" ry="4.1" transform={`rotate(${angle} ${cx} ${cy})`}
              fill="none" stroke="white" strokeWidth="1.45" />
          ))}
        </mask>
        {silverFinish && <clipPath id={id + "-finish"}><rect x="88" y="99" width="24" height="56" rx="2" /></clipPath>}
      </defs>
      <g transform={mirror ? "translate(" + (2 * sx + sourceWidth) + " 0) scale(-1 1)" : undefined}>
        <image href={cutout.source ?? catalogPhoto + product + ".webp"} width="200" height="200" mask={"url(#" + id + ")"} />
        {silverFinish && (
          <image href={pendantPhoto} width="200" height="200" clipPath={"url(#" + id + "-finish)"}
            style={{ filter: "grayscale(1) invert(.83) contrast(.86)" }} />
        )}
      </g>
    </svg>
  );
}
