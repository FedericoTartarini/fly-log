/* global describe, it, before, cy */

describe("Route tour playback", () => {
  before(() => {
    cy.visit("/login");
    cy.wait(500); // Allow React/Mantine hydration to fully complete
    cy.get('[data-cy="login-email"]')
      .should("exist")
      .should("be.visible")
      .should("not.be.disabled");
    // The user scripts/seed-emulator.mjs creates.
    cy.fixture("test-user").then(({ email, password }) => {
      cy.get('[data-cy="login-email"]').type(email);

      cy.get('[data-cy="login-password"]')
        .should("exist")
        .should("be.visible")
        .should("not.be.disabled");
      cy.get('[data-cy="login-password"]').type(password);
    });

    cy.get('[data-cy="login-submit"]').click();
    cy.location("pathname").should("eq", "/stats");
    // The header's page links; the Stats page no longer has a tour button.
    cy.contains("nav a", /^tour$/i).click();
    cy.location("pathname").should("eq", "/tour");
  });

  it("shows the globe and plays on to flight 2", () => {
    cy.contains("h1", /route tour/i).should("exist");
    cy.contains(/played oldest first/i).should("exist");
    // Before play, every airport has a dot.
    cy.get("figure svg").find("circle").its("length").should("be.gte", 2);
    cy.contains(/^Flight 1 of \d+$/).should("be.visible");

    cy.get('[data-cy="tour-play"]')
      .should("have.attr", "aria-label", "Play the tour")
      .click();
    cy.get('[data-cy="tour-play"]').should(
      "have.attr",
      "aria-label",
      "Pause the tour",
    );
    cy.contains(/Flight 2 of \d+$/, { timeout: 5000 }).should("be.visible");

    cy.get('[data-cy="tour-play"]').click();
    cy.get('[data-cy="tour-play"]').should(
      "have.attr",
      "aria-label",
      "Resume the tour",
    );
    cy.get('[data-cy="tour-scrub"]').should("have.value", "2");
  });
});
