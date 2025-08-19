/* global describe, it, beforeEach, cy, Cypress */

describe("Login Failure Scenario", () => {
  beforeEach(() => {
    cy.visit("/login");
    const email = Cypress.env("CY_WRONG_EMAIL");
    const password = Cypress.env("CY_WRONG_PASSWORD");
    expect(email, "CYPRESS email env var").to.be.a("string").and.not.be.empty;
    expect(password, "CYPRESS password env var").to.be.a("string").and.not.be
      .empty;
    cy.get('input[name="email"]').type(email, { log: false });
    cy.get('input[name="password"]').type(password, { log: false });
    cy.get('button[type="submit"]').click();
  });

  it("should display invalid login credentials", () => {
    cy.contains("Invalid login credentials").should("be.visible");
  });
});
