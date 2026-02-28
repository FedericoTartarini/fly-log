/* global describe, it, cy */

describe("Navigation drawer language dropdown", () => {
  it("shows both language options when the drawer is opened", () => {
    cy.viewport(375, 700);
    cy.visit("/");
    cy.get("button[aria-label='Open navigation menu']").click();
    cy.get("[data-cy = 'language-select']").click({
      force: true,
      multiple: true,
    });
    cy.contains("English");
    cy.contains("Italiano");
    cy.contains("Spanish").should("not.exist");
    cy.get("[role='option']").contains("Italiano").click({ force: true });
    cy.contains("Lingua");
    cy.contains("Language").should("not.exist");
  });
});
