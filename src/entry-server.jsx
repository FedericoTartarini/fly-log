// Renders "/" to HTML at build time (scripts/prerender.mjs), so the landing
// page arrives in index.html and the browser adopts it instead of drawing it.
import React from "react";
import { prerenderToNodeStream } from "react-dom/static";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router-dom";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import App from "./App.jsx";
import routes from "./routes.jsx";

// The English strings, bundled in rather than fetched as the browser does.
const files = import.meta.glob("../public/locales/en/*.json", {
  eager: true,
  import: "default",
});
const en = Object.fromEntries(
  Object.entries(files).map(([path, strings]) => [
    path.match(/([^/]+)\.json$/)[1],
    strings,
  ]),
);

export async function render(url) {
  await i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    ns: Object.keys(en),
    defaultNS: "common",
    resources: { en },
    react: { useSuspense: false },
  });

  const { query, dataRoutes } = createStaticHandler(routes);
  const context = await query(new Request(new URL(url, "http://localhost")));
  const router = createStaticRouter(dataRoutes, context);

  const app = (
    <App>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </App>
  );
  // prerender, unlike renderToString, waits for the lazy Landing chunk. A
  // large boundary would otherwise be sent as the skeleton plus a hidden copy
  // and a script that swaps them, which a non-rendering crawler can't follow.
  const { prelude } = await prerenderToNodeStream(app, {
    progressiveChunkSize: Infinity,
  });
  let html = "";
  for await (const chunk of prelude) html += chunk;
  return html;
}
