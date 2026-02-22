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
      ],
    }),
  ],
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

          if (
            id.includes("node_modules/@mantine") ||
            id.includes("node_modules/@emotion")
          ) {
            return "vendor-mantine";
          }

          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/@mantine/charts")
          ) {
            return "vendor-charts";
          }

          if (
            id.includes("node_modules/leaflet") ||
            id.includes("node_modules/react-leaflet")
          ) {
            return "vendor-maps";
          }

          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router")
          ) {
            return "vendor-react";
          }

          return "vendor-misc";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.mjs",
    // Define environment variables for the test environment
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: "your-test-anon-key",
    },
  },
});
