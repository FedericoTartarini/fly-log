// Pre-renders the landing page's example-log map into src/assets/landingMap.json,
// so the hero shows land without loading d3 or fetching shapes on first paint.
// Run with: node scripts/build-landing-map.mjs
import { writeFile } from "node:fs/promises";
import * as d3 from "d3";

// Same shapes as the route tour (src/pages/WorldTour.jsx).
const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
const WIDTH = 358;
// Crop out Antarctica, the Arctic and the empty Pacific west of the Americas.
const BOUNDS = [
  [-135, -48],
  [180, 78],
];
const AIRPORTS = {
  SYD: [151.18, -33.95],
  SIN: [103.99, 1.36],
  LHR: [-0.46, 51.47],
  FCO: [12.25, 41.8],
  JFK: [-73.78, 40.64],
  SFO: [-122.38, 37.62],
  HKG: [113.92, 22.31],
  AKL: [174.79, -37.01],
  PER: [115.97, -31.94],
};
const ROUTES = [
  ["SYD", "SIN"],
  ["SIN", "LHR"],
  ["SIN", "FCO"],
  ["LHR", "JFK"],
  ["JFK", "SFO"],
  ["SIN", "HKG"],
  ["SYD", "AKL"],
  ["SYD", "PER"],
];
const HUBS = ["SYD", "SIN"];

const projection = d3.geoEquirectangular();
const [[x0, y0], [x1, y1]] = BOUNDS;
const scale = WIDTH / (((x1 - x0) * Math.PI) / 180);
projection.scale(scale).translate([0, 0]);
const [left, top] = projection([x0, y1]);
projection.translate([-left, -top]);
const height = Math.round(projection([x1, y0])[1]);
// One decimal is finer than a pixel at this size and keeps the file small.
const path = d3.geoPath(projection).digits(1);

const world = await (await fetch(WORLD_GEOJSON_URL)).json();
const round = (n) => Math.round(n * 10) / 10;

// Keep a point only once it is 1.5 px from the last one, and drop islands
// under 2 px across. That cuts the outline from ~108 kB to ~29 kB (11 kB gzipped).
// ponytail: distance thinning, not Douglas–Peucker; good enough at 358 px.
function thin(d) {
  return d
    .split("M")
    .filter(Boolean)
    .map((ring) => {
      const closed = ring.endsWith("Z");
      const points = ring
        .replace("Z", "")
        .split("L")
        .map((p) => p.split(",").map(Number));
      const kept = [points[0]];
      for (const p of points.slice(1)) {
        const [x, y] = kept[kept.length - 1];
        if (Math.hypot(p[0] - x, p[1] - y) >= 2) kept.push(p);
      }
      const xs = kept.map((p) => p[0]);
      const ys = kept.map((p) => p[1]);
      const size = Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      );
      if (kept.length < 3 || size < 2) return "";
      return `M${kept.map((p) => p.map(Math.round).join(",")).join("L")}${closed ? "Z" : ""}`;
    })
    .join("");
}

await writeFile(
  new URL("../src/assets/landingMap.json", import.meta.url),
  JSON.stringify(
    {
      width: WIDTH,
      height,
      land: thin(path(world)),
      routes: ROUTES.map(([from, to]) =>
        path({
          type: "LineString",
          coordinates: [AIRPORTS[from], AIRPORTS[to]],
        }),
      ),
      dots: Object.entries(AIRPORTS).map(([code, lonLat]) => [
        ...projection(lonLat).map(round),
        HUBS.includes(code) ? 5 : 3.5,
      ]),
    },
    null,
    2,
  ) + "\n",
);
