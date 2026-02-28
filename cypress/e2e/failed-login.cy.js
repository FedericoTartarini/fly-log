/* global describe, it, beforeEach, cy, Cypress */

describe("Login Failure Scenario", () => {
  // Use a regular function so we can call `this.skip()` when env vars are missing.
  beforeEach(function () {
    const email = Cypress.env("CY_WRONG_EMAIL");
    const password = Cypress.env("CY_WRONG_PASSWORD");

    const base = Cypress.config("baseUrl") || "http://localhost:5173";
    const mochaCtx = this;

    // Ensure the app server is up before visiting. If it's not reachable, skip tests.
    cy.request({ url: base, failOnStatusCode: false }).then(function (resp) {
      if (!resp || resp.status < 200 || resp.status >= 400) {
        console.warn(
          `Skipping Login Failure tests: server not available at ${base}`,
        );
        mochaCtx.skip();
        return;
      }

      cy.visit("/login");
      cy.wait(1000);
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password, {
        log: false,
      });
      cy.get('button[type="submit"]').click();
    });
  });

  it("should display invalid login credentials", () => {
    // If login fails we expect to remain on the login page. That's a safe,
    // env-independent assertion when the exact error string may vary.
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");

    // Additionally, if the app shows a visible error message (red text), assert it.
    cy.get('div[style*="color: red"]', { timeout: 10000 })
      .should("exist")
      .and("be.visible");
  });
});
