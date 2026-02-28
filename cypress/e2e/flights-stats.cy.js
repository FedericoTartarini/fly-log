/* global describe, it, beforeEach, cy, Cypress */

describe("StatsSummary Component", () => {
  // Skip tests when login env vars are not present; this avoids noisy failures in CI
  beforeEach(function () {
    const email = Cypress.env("CY_TEST_EMAIL");
    const password = Cypress.env("CY_TEST_PASSWORD");

    cy.visit("/login");
    cy.wait(500); // Allow React/Mantine hydration to fully complete
    cy.get('[data-cy="login-email"]')
      .should("exist")
      .should("be.visible")
      .should("not.be.disabled");
    cy.get('[data-cy="login-email"]').type(email, { log: false });

    cy.get('[data-cy="login-password"]')
      .should("exist")
      .should("be.visible")
      .should("not.be.disabled");
    cy.get('[data-cy="login-password"]').type(password, { log: false });

    cy.get('[data-cy="login-submit"]').click();
    cy.location("pathname").should("eq", "/stats");
  });

  it("should display the correct statistics for all flights", () => {
    cy.wait(500);
    cy.scrollTo(0, 500);
    // Verify the presence of key statistics robustly by data-cy selectors
    cy.get('[data-cy="total-flights-value"]').should("be.visible");
    cy.get('[data-cy="total-flights-label"]').should("be.visible");
    cy.get('[data-cy="total-distance-value"]').should("be.visible");
    cy.get('[data-cy="total-distance-label"]').should("be.visible");
    cy.get('[data-cy="total-time-value"]').should("be.visible");
    cy.get('[data-cy="total-time-label"]').should("be.visible");
    cy.get('[data-cy="airports-visited-value"]').should("be.visible");
    cy.get('[data-cy="airports-visited-label"]').should("be.visible");
    cy.get('[data-cy="airlines-flown-value"]').should("be.visible");
    cy.get('[data-cy="airlines-flown-label"]').should("be.visible");
    cy.get('[data-cy="countries-visited-value"]').should("be.visible");
    cy.get('[data-cy="countries-visited-label"]').should("be.visible");

    // Prefer robust selectors if available, but keep visible text for feature sections as backup
    cy.contains(/filter flights/i).should("be.visible");
  });
});
