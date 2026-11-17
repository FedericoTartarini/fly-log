// Writes src/assets/stampInks.json, the ink colour of each passport stamp:
// { "IT": ["#light", "#dark"], ... }. A dev tool, not part of the build.
// Run with: node scripts/build-stamp-inks.mjs
// Needs npm, rsvg-convert and magick (librsvg and imagemagick on Homebrew).
//
// Source: the 4:3 flag SVGs of flag-icons 7.6.0 (MIT licence,
// https://github.com/lipis/flag-icons), downloaded from the npm tarball.
// The rule: each stamp takes the flag colour whose hue family is rarest across
// all flags. Most flags have red, so the largest colour made half the stamps
// red. The white skip, the 5 % threshold, the families and the tie-break are
// our choices, not a standard.
// 1. Rasterise each flag at 400x300 and count the pixels of each colour.
//    Transparent pixels count as white.
// 2. Skip near-white (OKLCH L > 0.92 and C < 0.03), because a white ink would
//    vanish in light mode and white is the field, not the emblem, of JP or KR.
//    Keep the colours that cover at least 5 % of the flag (MIN_SHARE), so
//    specks in an emblem don't count. A flag with none keeps its largest one.
// 3. Put each colour in a hue family by OKLCH hue h (degrees), chroma C and
//    lightness L, checked in this order:
//      black/grey  C < 0.04
//      brown       38 <= h < 100, L < 0.65 and C < 0.13 (dark ochre)
//      red         h < 38 or h >= 345
//      orange      38 <= h < 70
//      yellow      70 <= h < 115
//      green       115 <= h < 185
//      blue        185 <= h < 295 (aquamarine and sky blue included)
//      purple      295 <= h < 345
//    The cut-offs sit in gaps between the flag colours, so moving one by a
//    few degrees changes no flag.
// 4. Count in how many flags each family appears.
// 5. Take the colour whose family appears in the fewest flags. On a tie, for
//    example two blues in one flag, the larger area wins.
// 6. For each theme, keep the OKLCH hue and move lightness in 0.01 steps away
//    from --fl-surface (src/theme.js), cutting chroma only to stay in sRGB,
//    until the WCAG contrast is at least 4.5:1.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VERSION = "7.6.0";
const BG = ["#FFFFFF", "#181D27"]; // --fl-surface, light then dark
const MIN = 4.5;
const MIN_SHARE = 0.05;
const W = 400;
const H = 300;

// ---- colour maths: sRGB <-> OKLCH, WCAG 2.x contrast ----
const hex2rgb = (h) =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgb2hex = (c) =>
  "#" +
  c
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = (v) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const lum = (h) => {
  const [r, g, b] = hex2rgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
function toOklch(h) {
  const [r, g, b] = hex2rgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}
function fromOklch([L, C, Hue]) {
  const A = C * Math.cos(Hue);
  const B = C * Math.sin(Hue);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// Step 6.
function fit(hex, bg) {
  if (contrast(hex, bg) >= MIN) return hex;
  let [L, C, Hue] = toOklch(hex);
  const step = lum(bg) > 0.5 ? -0.01 : 0.01;
  for (let i = 0; i < 100; i++) {
    L = Math.min(1, Math.max(0, L + step));
    let c = C;
    let rgb = fromOklch([L, c, Hue]);
    while (rgb.some((v) => v < -1e-4 || v > 1 + 1e-4) && c > 0) {
      c -= 0.005;
      rgb = fromOklch([L, c, Hue]);
    }
    const out = rgb2hex(rgb.map(gam));
    if (contrast(out, bg) >= MIN) return out;
  }
  throw new Error(`No ink reaches ${MIN}:1 for ${hex} on ${bg}`);
}

// Steps 1 and 2: the flag's colours, largest first.
function flagColours(file) {
  const png = execFileSync("rsvg-convert", ["-w", W, "-h", H, file]);
  const hist = execFileSync(
    "magick",
    // Transparent pixels (the cut-out around NP) become white, so step 2 skips them.
    [
      "png:-",
      "-background",
      "white",
      "-alpha",
      "remove",
      "-format",
      "%c",
      "histogram:info:-",
    ],
    { input: png, maxBuffer: 64 << 20 },
  ).toString();
  const coloured = [...hist.matchAll(/^\s*(\d+):.*?(#[0-9A-F]{6})/gim)]
    .map((m) => ({ share: +m[1] / (W * H), hex: m[2].toUpperCase() }))
    .filter(({ hex }) => {
      const [L, C] = toOklch(hex);
      return !(L > 0.92 && C < 0.03);
    })
    .sort((a, b) => b.share - a.share);
  const big = coloured.filter(({ share }) => share >= MIN_SHARE);
  return (big.length ? big : coloured.slice(0, 1)).map((c) => ({
    ...c,
    family: family(c.hex),
  }));
}

// Step 3. Hue in degrees, 0 to 360.
function family(hex) {
  const [L, C, rad] = toOklch(hex);
  const h = ((rad * 180) / Math.PI + 360) % 360;
  if (C < 0.04) return "black/grey";
  if (h >= 38 && h < 100 && L < 0.65 && C < 0.13) return "brown";
  if (h < 38 || h >= 345) return "red";
  if (h < 70) return "orange";
  if (h < 115) return "yellow";
  if (h < 185) return "green";
  if (h < 295) return "blue";
  return "purple";
}

const dir = mkdtempSync(join(tmpdir(), "flag-icons-"));
try {
  const tgz = execFileSync(
    "npm",
    ["pack", `flag-icons@${VERSION}`, "--silent", "--pack-destination", dir],
    { encoding: "utf8" },
  ).trim();
  execFileSync("tar", ["-xzf", join(dir, tgz), "-C", dir]);
  const flags = join(dir, "package", "flags", "4x3");
  const colours = {};
  for (const name of readdirSync(flags).sort()) {
    // Country codes only, which skips regions such as gb-eng and the xx placeholder.
    const code = name.match(/^([a-z]{2})\.svg$/)?.[1]?.toUpperCase();
    if (!code || code === "XX") continue;
    const list = flagColours(join(flags, name));
    if (list.length) colours[code] = list;
  }
  // Step 4: in how many flags each family appears.
  const flagsWith = {};
  for (const list of Object.values(colours)) {
    for (const f of new Set(list.map((c) => c.family))) {
      flagsWith[f] = (flagsWith[f] ?? 0) + 1;
    }
  }
  console.log("Flags with each family:", flagsWith);
  // Step 5. Each list is sorted by area, so the first colour of the rarest
  // family is the pick.
  const inks = {};
  for (const [code, list] of Object.entries(colours)) {
    const rarest = Math.min(...list.map((c) => flagsWith[c.family]));
    const { hex } = list.find((c) => flagsWith[c.family] === rarest);
    inks[code] = BG.map((bg) => fit(hex, bg));
  }
  const out = new URL("../src/assets/stampInks.json", import.meta.url);
  // One country per line, so a regenerated map diffs cleanly.
  const lines = Object.entries(inks).map(
    ([code, ink]) => `"${code}":${JSON.stringify(ink)}`,
  );
  writeFileSync(out, `{\n${lines.join(",\n")}\n}\n`);
  console.log(`Wrote ${lines.length} inks to ${out.pathname}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
