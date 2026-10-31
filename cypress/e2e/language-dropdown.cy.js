/* global describe, it, cy */

describe("Account menu language dropdown", () => {
  it("shows both language options when the account menu is opened", () => {
    cy.viewport(375, 700);
    cy.visit("/");
    cy.wait(600);
    cy.get('[data-cy="account-menu"]').should("be.visible").click();
    cy.wait(1000); // wait for the bottom sheet to slide up
    cy.get('[data-cy="account-panel"]')
      .should("exist")
      .within(() => {
        cy.get('[data-cy="language-select"]')
          .should("be.visible")
          .click({ force: true });
      });
    cy.get('[data-cy="language-option-en"]').should("be.visible");
    cy.get('[data-cy="language-option-it"]').should("be.visible");
    cy.get('[data-cy^="language-option-"]').should("have.length", 2);
    // Mantine portals need {force:true} for option click due to absolute positioning
    cy.get('[data-cy="language-option-it"]').click({
      force: true,
      multiple: true,
    });
    cy.get('[data-cy="account-panel"]').contains("Lingua").should("be.visible");
    cy.contains("Language").should("not.exist");
  });
});
