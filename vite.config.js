import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

// Reference data is kept pretty-printed in git so its diffs stay reviewable,
// and minified on the way out so it is not shipped as indented JSON.
const minifyJson = (content) => JSON.stringify(JSON.parse(content));

// https://vite.dev/config/
export default defineConfig({
  // Stamped into the footer so it always shows when the running build was
  // published, instead of a version number nobody remembers to bump.
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "src/sw.js",
          dest: "",
          // Stamp the build id into CACHE_NAME so each deploy gets a fresh
          // cache and the activate handler evicts the previous one. Only ever
          // compared for equality, so a timestamp is enough.
          transform: (content) =>
            content.replace(/__BUILD_ID__/g, String(Date.now())),
        },
        {
          src: "src/assets/logos/*",
          dest: "logos",
        },
        {
          src: "src/assets/airports.json",
          dest: "data",
          transform: minifyJson,
        },
        {
          src: "src/assets/airlines.json",
          dest: "data",
          transform: minifyJson,
        },
        {
          src: "src/assets/world-fallback.json",
          dest: "data",
          transform: minifyJson,
        },
      ],
    }),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    minify: "terser",
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        pure_funcs: ["console.log", "console.debug"],
      },
    },
    rollupOptions: {
      output: {
        // Split heavy vendor libraries to reduce the main app chunk.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("node_modules/firebase")) {
            return "vendor-firebase";
          }

          // if (
          //   id.includes("node_modules/recharts") ||
          //   id.includes("node_modules/@mantine/charts")
          // ) {
          //   return "vendor-charts";
          // }

          if (
            id.includes("node_modules/@mantine") ||
            id.includes("node_modules/@emotion")
          ) {
            return "vendor-mantine";
          }

          if (
            id.includes("node_modules/leaflet") ||
            id.includes("node_modules/react-leaflet")
          ) {
            return "vendor-maps";
          }

          if (
            id.includes("node_modules/i18next") ||
            id.includes("node_modules/react-i18next")
          ) {
            return "vendor-i18n";
          }

          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router/")
          ) {
            return "vendor-react";
          }

          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }

          if (id.includes("node_modules/@tabler/icons-react")) {
            return "vendor-icons";
          }

          if (
            id.includes("node_modules/papaparse") ||
            id.includes("node_modules/geodesy")
          ) {
            return "vendor-utils";
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.mjs",
  },
});
