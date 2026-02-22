import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "src/sw.js",
          dest: "",
        },
        {
          src: "src/assets/logos/*",
          dest: "logos",
        },
        {
          src: "src/assets/airports.json",
          dest: "data",
        },
        {
          src: "src/assets/airlines.json",
          dest: "data",
        },
        {
          src: "src/assets/world-fallback.json",
          dest: "data",
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
