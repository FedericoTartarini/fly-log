import { defineConfig } from "cypress";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  e2e: {
    setupNodeEvents() {
      // implement node event listeners here
    },
    // Expose environment variables to Cypress
    env: {
      ...process.env, // This exposes all process.env variables
      // You can also explicitly define specific variables if needed
      // MY_CUSTOM_VAR: process.env.MY_CUSTOM_VAR,
    },
    baseUrl: "http://localhost:5173",
    supportFile: false,
  },
});
