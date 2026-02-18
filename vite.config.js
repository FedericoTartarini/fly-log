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
        // Use default chunking to avoid load-order issues
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
