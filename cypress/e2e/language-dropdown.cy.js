/* global describe, it, cy */

describe("Navigation drawer language dropdown", () => {
  it("shows both language options when the drawer is opened", () => {
    cy.viewport(375, 700);
    cy.visit("/");
    cy.wait(600);
    cy.get('[data-cy="menu-mobile-open"]').should("be.visible").click();
    cy.wait(1000); // wait for Mantine Drawer animation (increased for diagnostics)
    cy.get('[data-cy="drawer"]')
      .should("exist")
      .within(() => {
        cy.get('[data-cy="language-select"]')
          .should("be.visible")
          .click({ force: true });
      });
    cy.get('[data-cy="language-option-en"]').should("be.visible");
    cy.get('[data-cy="language-option-it"]').should("be.visible");
    cy.get('[data-cy^="language-option-"]').should("have.length", 4);
    // Mantine portals need {force:true} for option click due to absolute positioning
    cy.get('[data-cy="language-option-it"]').click({
      force: true,
      multiple: true,
    });
    cy.get('[data-cy="drawer"]').contains("Lingua").should("be.visible");
    cy.contains("Language").should("not.exist");
  });
});
