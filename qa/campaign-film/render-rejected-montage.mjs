import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";

const ffmpeg = process.argv[2] ?? "ffmpeg";
const serif = process.argv[3] ?? "C:/Windows/Fonts/georgia.ttf";
const italic = process.argv[4] ?? "C:/Windows/Fonts/georgiai.ttf";
if (![serif, italic].every((font) => existsSync(font))) {
  throw new Error("Pass the paths to a serif font and its italic companion after the FFmpeg path.");
}
const size = "1280x640";
const fps = 24;
const dissolve = .5;
const assets = "public/assets/homepage";
const output = "qa/campaign-film/rejected-photo-montage.mp4";
const shots = [
  { image: "campaign", seconds: 4, zoom: .00037, horizontal: .5, vertical: .5 },
  { image: "makeup", seconds: 3.5, zoom: .00072, horizontal: .42, vertical: .61 },
  { image: "fashion", seconds: 3.5, zoom: .00070, horizontal: .55, vertical: .37 },
  { image: "fragrance", seconds: 3.5, zoom: .00082, horizontal: .48, vertical: .55 },
];

const args = ["-hide_banner", "-loglevel", "error", "-y", "-filter_complex_threads", "2"];
const filters = shots.map(({ image, seconds, zoom, horizontal, vertical }, index) => {
  args.push("-i", assets + "/" + image + ".webp");
  return "[" + index + ":v]scale=2560:1280:force_original_aspect_ratio=increase:flags=lanczos,crop=2560:1280,setsar=1," +
    "zoompan=z='1+on*" + zoom + "':x='(iw-iw/zoom)*" + horizontal + "':y='(ih-ih/zoom)*" + vertical +
    "':d=" + seconds * fps + ":s=" + size + ":fps=" + fps + ",format=yuv420p,settb=1/24[shot" + index + "]";
});
const titleSeconds = 2.5;
args.push("-f", "lavfi", "-i", "color=c=0x171512:s=" + size + ":r=" + fps + ":d=" + titleSeconds);

function centerText(font, text, fontSize, y, color = "0xfffcf8") {
  const file = font.replaceAll("\\", "/").replaceAll(":", "\\:");
  return "drawtext=fontfile='" + file + "':text='" + text + "':fontcolor=" + color + ":fontsize=" + fontSize +
    ":x=(w-tw)/2:y=" + y;
}

filters.push("[" + shots.length + ":v]format=yuv420p,settb=1/24," + [
  centerText(serif, "FAIRY", 105, 187),
  "drawbox=x=599:y=318:w=82:h=1:color=0xb59a80:t=fill",
  centerText(italic, "Everything you love.", 38, 360),
  centerText(italic, "Beautifully together.", 38, 406),
].join(",") + "[title]");

let elapsed = shots[0].seconds;
let left = "shot0";
for (let index = 1; index <= shots.length; index++) {
  const right = index < shots.length ? "shot" + index : "title";
  const next = "cut" + index;
  filters.push("[" + left + "][" + right + "]xfade=transition=fade:duration=" + dissolve + ":offset=" + (elapsed - dissolve) + "[" + next + "]");
  left = next;
  elapsed += (shots[index]?.seconds ?? titleSeconds) - dissolve;
}

mkdirSync(assets, { recursive: true });
const result = spawnSync(ffmpeg, [
  ...args, "-filter_complex", filters.join(";"), "-map", "[" + left + "]", "-an",
  "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "22",
  "-threads", "4", "-movflags", "+faststart", output,
], { stdio: "inherit" });
if (result.status !== 0) throw new Error("FFmpeg could not render the campaign film.", { cause: result.error });
console.log("Rendered " + elapsed + " seconds to " + output);
