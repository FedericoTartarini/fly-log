/* global process */

import { defineConfig } from "cypress";
import dotenv from "dotenv";
import { existsSync } from "node:fs";

// List only Cypress-related variables to expose
const CYPRESS_ENV_VARS = [
  "CY_TEST_EMAIL",
  "CY_TEST_PASSWORD",
  "CY_WRONG_EMAIL",
  "CY_WRONG_PASSWORD",
];

// Load .env.local if present, otherwise fallback to .env
dotenv.config();
if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

// Build Cypress env object with only the relevant variables
const env = {};
CYPRESS_ENV_VARS.forEach((key) => {
  if (process.env[key]) env[key] = process.env[key];
});

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      return config;
    },
    env,
    baseUrl: "http://localhost:5173",
    supportFile: false,
  },
});
