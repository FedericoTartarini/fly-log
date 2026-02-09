import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          mantine: [
            "@mantine/core",
            "@mantine/hooks",
            "@mantine/notifications",
            "@mantine/dates",
          ],
          charts: ["@mantine/charts"],
          store: ["./src/store.ts"],
          utils: [
            "./src/utils/flightService",
            "./src/utils/dateUtils",
            "./src/utils/chartUtils",
          ],
          leaflet: ["leaflet", "react-leaflet"],
          i18n: ["i18next", "react-i18next"],
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
