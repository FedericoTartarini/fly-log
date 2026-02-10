import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: {
        swSrc: "src/sw.js",
        swDest: "dist/sw.js",
      },
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
        manualChunks(id) {
          if (id.includes("/src/store")) return "store";
          if (id.includes("/src/utils/")) return "utils";
          if (id.includes("react-leaflet") || id.includes("/leaflet"))
            return "leaflet";
          if (id.includes("react-i18next") || id.includes("/i18next"))
            return "i18n";
          if (id.includes("@mantine/charts")) return "charts";
          if (id.includes("/node_modules/react-router-dom/")) return "vendor";
          if (
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react/")
          )
            return "vendor";
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
