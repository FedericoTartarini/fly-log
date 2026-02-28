/* global describe, it, cy */

describe("Public route smoke tests", () => {
  it("navigates from landing to about", () => {
    cy.visit("/");
    cy.contains("Learn More").click();
    cy.location("pathname").should("eq", "/about");
    cy.contains("About My Flight Tracker").should("be.visible");
  });

  it("navigates from landing to login", () => {
    cy.visit("/");
    cy.contains("Get Started").click();
    cy.location("pathname").should("eq", "/login");
    cy.get('[data-cy="login-email"]').should("be.visible");
  });
});
