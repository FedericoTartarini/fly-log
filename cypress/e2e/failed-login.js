describe("Login Failure Scenario", () => {
  beforeEach(() => {
    cy.visit("/login");
    cy.get('input[name="email"]').type(Cypress.env("TEST_USER_EMAIL"));
    cy.get('input[name="password"]').type(Cypress.env("TEST_USER_PASSWORD"));
    cy.get('button[type="submit"]').click();
  });

  it("should display invalid login credentials", () => {
    cy.contains("Invalid login credentials").should("be.visible");
  });
});
