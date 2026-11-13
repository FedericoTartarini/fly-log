/* global describe, it, cy */

describe("Public route smoke tests", () => {
  it("navigates from landing to about", () => {
    cy.visit("/");
    cy.get("footer").contains("a", "About").click();
    cy.location("pathname").should("eq", "/about");
    cy.contains("About My Flight Tracker").should("be.visible");
  });

  it("navigates from landing to login", () => {
    cy.visit("/");
    cy.contains("a", "Start your log").click();
    cy.location("pathname").should("eq", "/login");
    cy.get('[data-cy="login-email"]').should("be.visible");
  });
});
