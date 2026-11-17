import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      return config;
    },
    // No spec needs Cypress.env(), and leaving it on would hand its values to
    // any page code.
    allowCypressEnv: false,
    baseUrl: "http://localhost:5173",
    supportFile: "cypress/support/e2e.js",
  },
});
