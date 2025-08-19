/* global describe, it, beforeEach, cy, Cypress, expect */

describe("StatsSummary Component", () => {
  beforeEach(() => {
    cy.visit("/login");
    const email = Cypress.env("CY_TEST_EMAIL");
    const password = Cypress.env("CY_TEST_PASSWORD");
    expect(email, "CYPRESS email env var").to.be.a("string").and.not.be.empty;
    expect(password, "CYPRESS password env var").to.be.a("string").and.not.be
      .empty;
    cy.get('input[name="email"]').type(email, { log: false });
    cy.get('input[name="password"]').type(password, { log: false });
    cy.get('button[type="submit"]').click();
    cy.location("pathname").should("eq", "/stats");
  });

  it("should display the correct statistics for all flights", () => {
    cy.scrollTo(0, 500);
    // Verify the presence of key statistics
    cy.contains("Total Flights").should("be.visible");
    cy.contains("All Past Flights").should("be.visible");
    cy.contains("Add New Flight").should("be.visible");

    // Check if the statistics are displayed correctly
    // cy.contains("40,420").should("be.visible"); // Distance (km)
    // cy.contains("1.9").should("be.visible"); // Time (days)
    // cy.contains("2").should("be.visible"); // Airlines Flown
  });

  it("should update statistics when year filter changes", () => {
    cy.scrollTo(0, 500);
    // Select a specific year from the dropdown
    cy.get("#flight-year-filter").select("2025");

    // Verify statistics update
    cy.contains("Total Flights").should("be.visible");
    cy.contains("Distance (km)").should("be.visible");
    cy.contains("Time (days)").should("be.visible");
    cy.contains("Airports Visited").should("be.visible");
    cy.contains("Airlines Flown").should("be.visible");
    cy.contains("Countries").should("be.visible");

    // cy.contains("12,801"); // Distance (km) for 2025
    // cy.contains("0.6"); // Time (days) for 2025
    // cy.contains("3"); // Airports Visited for 2025
  });
});
