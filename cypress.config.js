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
    // Specs read the secrets above with cy.env(), which keeps them out of
    // the browser. Cypress.env() would hand them to any page code.
    allowCypressEnv: false,
    // Public flags, so a spec can skip at once when a fork's pull request
    // gets no secrets.
    expose: {
      HAS_TEST_ACCOUNT: Boolean(env.CY_TEST_EMAIL && env.CY_TEST_PASSWORD),
      HAS_WRONG_ACCOUNT: Boolean(env.CY_WRONG_EMAIL && env.CY_WRONG_PASSWORD),
    },
    baseUrl: "http://localhost:5173",
    supportFile: false,
  },
});
