// Writes the landing page, rendered by dist-ssr/entry-server.js, into
// dist/index.html. Runs after both Vite builds (see "build" in package.json).
import { readFile, rm, writeFile } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const { render } = await import("../dist-ssr/entry-server.js");
const html = await render("/");

// The Landing page is a lazy chunk, so Vite only links its CSS once the chunk
// loads. The prerendered page needs it from the first paint, and the JS is
// preloaded so React can adopt the page sooner.
const manifestFile = new URL(".vite/manifest.json", dist);
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
const css = new Set();
const js = new Set();
const collect = (key) => {
  const chunk = manifest[key];
  if (!chunk || js.has(chunk.file)) return;
  js.add(chunk.file);
  chunk.css?.forEach((file) => css.add(file));
  chunk.imports?.forEach(collect);
};
// Keyed by its file name rather than its source path, so found by name.
const landing = Object.keys(manifest).find(
  (key) => manifest[key].name === "Landing" && manifest[key].isDynamicEntry,
);
if (!landing) throw new Error("The Landing chunk is not in the manifest");
collect(landing);
const file = new URL("index.html", dist);
let page = await readFile(file, "utf8");
const marker = '<div id="root"></div>';
if (!page.includes(marker))
  throw new Error(`${marker} not found in index.html`);
// Files the page already links (shared vendor chunks) are not added twice.
const links = [
  ...[...css].map((f) => [f, "stylesheet"]),
  ...[...js].map((f) => [f, "modulepreload"]),
]
  .filter(([f]) => !page.includes(`/${f}"`))
  .map(([f, rel]) => `<link rel="${rel}" crossorigin href="/${f}">`)
  .join("\n    ");
page = page
  .replace("</head>", `  ${links}\n  </head>`)
  .replace(marker, `<div id="root">${html}</div>`);
await writeFile(file, page);

await rm(new URL(".vite", dist), { recursive: true });
await rm(new URL("../dist-ssr", import.meta.url), { recursive: true });
console.log(`Prerendered / into dist/index.html (${html.length} characters)`);
