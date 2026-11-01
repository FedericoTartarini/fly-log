/* global describe, it, beforeEach, cy, Cypress */

describe("StatsSummary Component", () => {
  beforeEach(function () {
    // Pull requests from forks don't get the repo's secrets, so there is no
    // account to log in with. The full suite runs again after merging.
    if (!Cypress.expose("HAS_TEST_ACCOUNT")) {
      this.skip();
      return;
    }

    cy.visit("/login");
    cy.wait(500); // Allow React/Mantine hydration to fully complete
    cy.get('[data-cy="login-email"]')
      .should("exist")
      .should("be.visible")
      .should("not.be.disabled");
    cy.env(["CY_TEST_EMAIL", "CY_TEST_PASSWORD"]).then(
      ({ CY_TEST_EMAIL: email, CY_TEST_PASSWORD: password }) => {
        cy.get('[data-cy="login-email"]').type(email, { log: false });

        cy.get('[data-cy="login-password"]')
          .should("exist")
          .should("be.visible")
          .should("not.be.disabled");
        cy.get('[data-cy="login-password"]').type(password, { log: false });
      },
    );

    cy.get('[data-cy="login-submit"]').click();
    cy.location("pathname").should("eq", "/stats");
  });

  it("should display the correct statistics for all flights", () => {
    cy.wait(500);
    cy.scrollTo(0, 500);
    // Verify the presence of key statistics robustly by data-cy selectors
    cy.get('[data-cy="total-flights-value"]').should("be.visible");
    cy.get('[data-cy="total-flights-label"]').should("be.visible");
    cy.get('[data-cy="total-distance-value"]').should("be.visible");
    cy.get('[data-cy="total-distance-label"]').should("be.visible");
    cy.get('[data-cy="total-time-value"]').should("be.visible");
    cy.get('[data-cy="total-time-label"]').should("be.visible");
    cy.get('[data-cy="airports-visited-value"]').should("be.visible");
    cy.get('[data-cy="airports-visited-label"]').should("be.visible");
    cy.get('[data-cy="airlines-flown-value"]').should("be.visible");
    cy.get('[data-cy="airlines-flown-label"]').should("be.visible");
    cy.get('[data-cy="countries-visited-value"]').should("be.visible");
    cy.get('[data-cy="countries-visited-label"]').should("be.visible");

    // The header's filter button opens the panel. A filter shows as a tag on
    // the boarding pass, and the dot moves into the button's label. Scroll
    // back up first, because the header hides on the way down.
    cy.scrollTo(0, 0);
    cy.get('[data-cy="filter-button"]').should("be.visible").click();
    cy.get('[role="dialog"]').contains("label", "Upcoming").click();
    cy.get('[role="dialog"]')
      .contains("button", /^Show \d+ flights?$/)
      .click();
    cy.get('[role="dialog"]').should("not.exist");
    cy.get('[aria-label="Remove filter: Upcoming"]').should("be.visible");
    cy.get('[data-cy="filter-button"]').should(
      "have.attr",
      "aria-label",
      "Filter flights, 1 filter on",
    );
    cy.get('[role="group"][aria-label="Active filters"]')
      .contains("button", "Clear all")
      .click();
    cy.get('[aria-label="Remove filter: Upcoming"]').should("not.exist");

    // A second test can't log in again: the Firebase session survives, so
    // /login redirects straight to /stats. Check the All stats page here.
    cy.get('[data-cy="all-stats-link"]').click();
    cy.location("pathname").should("eq", "/stats/all");
    cy.get('[data-cy="total-co2-value"]').should("be.visible");
  });
});
