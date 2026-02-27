/* global describe, it, beforeEach, cy, Cypress */

describe("StatsSummary Component", () => {
  // Skip tests when login env vars are not present; this avoids noisy failures in CI
  beforeEach(function () {
    const email = Cypress.env("CY_TEST_EMAIL");
    const password = Cypress.env("CY_TEST_PASSWORD");

    cy.visit("/login");
    cy.get('input[name="email"]').type(email, { log: false });
    cy.get('input[name="password"]').type(password, { log: false });
    cy.get('button[type="submit"]').click();
    cy.location("pathname").should("eq", "/stats");
  });

  it("should display the correct statistics for all flights", () => {
    cy.scrollTo(0, 500);
    // Verify the presence of key statistics
    cy.contains("Total Flights").should("be.visible");
    cy.contains("Add New Flight").should("be.visible");

    // Verify statistics update
    cy.contains("Total Flights").should("be.visible");
    cy.contains("Distance (km)").should("be.visible");
    cy.contains("Time (days)").should("be.visible");
    cy.contains("Airports Visited").should("be.visible");
    cy.contains("Airlines Flown").should("be.visible");
    cy.contains("Countries").should("be.visible");

    // Use a case-insensitive contains to reduce fragility instead of exact string match
    cy.contains(/filter flights/i).should("be.visible");
  });
});
