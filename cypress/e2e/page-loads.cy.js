/* global describe, it, cy */

describe("Page loads", () => {
  it("loads the landing page", () => {
    cy.visit("/");
    cy.contains("h1", "Every flight you take, logged and mapped.").should(
      "be.visible",
    );
  });

  it("loads the login page", () => {
    cy.visit("/login");
    cy.get('[data-cy="login-email"]').should("be.visible");
    cy.get('[data-cy="login-password"]').should("be.visible");
  });

  it("loads the about page", () => {
    cy.visit("/about");
    cy.contains("About My Flight Tracker").should("be.visible");
  });
});
