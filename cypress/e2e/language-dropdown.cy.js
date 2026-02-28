/* global describe, it, cy */

describe("Navigation drawer language dropdown", () => {
  it("shows both language options when the drawer is opened", () => {
    cy.viewport(375, 700);
    cy.visit("/");
    cy.get("button[aria-label='Open navigation menu']").click();
    cy.get("[data-cy='language-select']:visible").should("have.length", 1).click();
    cy.contains("English").should("be.visible");
    cy.contains("Italiano").should("be.visible");
    cy.get("[role='option']").contains("Italiano").click();
    cy.contains("Lingua").should("be.visible");
  });
});
