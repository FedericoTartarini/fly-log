/* global describe, it, before, cy, Cypress */

describe("WorldTour Globe Animation Controls", () => {
  before(() => {
    const email = Cypress.env("CY_TEST_EMAIL");
    const password = Cypress.env("CY_TEST_PASSWORD");

    cy.visit("/login");
    cy.wait(500); // Allow React/Mantine hydration to fully complete
    cy.get('[data-cy="login-email"]')
      .should("exist")
      .should("be.visible")
      .should("not.be.disabled");
    cy.get('[data-cy="login-email"]').type(email, { log: false });

    cy.get('[data-cy="login-password"]')
      .should("exist")
      .should("be.visible")
      .should("not.be.disabled");
    cy.get('[data-cy="login-password"]').type(password, { log: false });

    cy.get('[data-cy="login-submit"]').click();
    cy.wait(500); // Allow React/Mantine hydration to fully complete
    cy.scrollTo(0, 500);
    cy.contains("button", /view route tour/i).click();
    cy.location("pathname").should("eq", "/tour");
    cy.scrollTo(0, 500);
  });

  it("should load the globe UI, and show all city markers by default", () => {
    // Basic title/content check
    cy.contains(/route tour/i).should("exist");
    // Assume that city dots are SVG circle elements with a certain class or role
    cy.get("svg").find("circle").its("length").should("be.gte", 2); // Expect at least some dots

    cy.contains("button", /start/i).should("be.enabled");
    cy.contains("button", /pause/i).should("not.exist"); // Pause only appears when animating
    cy.contains("button", /stop/i).should("not.be.enabled"); // Same logic

    cy.contains("button", /start/i).click();
    cy.contains("button", /pause/i).should("be.visible").and("be.enabled");
    cy.contains("button", /stop/i).should("be.visible").and("be.enabled");
    cy.contains("button", /resume/i).should("not.exist");
    cy.contains("button", /stop/i).click();

    cy.contains("button", /start/i).click();
    // There should be only 2 city markers visible for active step
    cy.get("svg").find("circle").filter(":visible").should("have.length", 2);
    cy.contains("button", /stop/i).click();

    cy.contains("button", /start/i).click();
    cy.contains("button", /pause/i).click();
    cy.contains("button", /resume/i)
      .should("be.visible")
      .and("be.enabled");
    cy.get("svg").find("circle").filter(":visible").should("have.length", 2);
    cy.contains("button", /resume/i).click();
    cy.contains("button", /pause/i).should("be.visible").and("be.enabled");
    cy.contains("button", /stop/i).click();

    cy.contains("button", /start/i).click();
    cy.contains("button", /stop/i).click();
    // All city markers should be visible again
    cy.get("svg")
      .find("circle")
      .filter(":visible")
      .its("length")
      .should("be.gte", 2);

    // Animation controls return to idle
    cy.contains("button", /start/i).should("be.enabled");
    cy.contains("button", /pause/i).should("not.exist");
    cy.contains("button", /resume/i).should("not.exist");
    cy.contains("button", /stop/i).should("not.be.enabled");

    // // Zoom logic usually involves D3 mouse events on the globe SVG
    // // Try triggering zoom via wheel or custom control
    // // This is a placeholder test; class/tags may need to be adapted
    // cy.get("svg").trigger("wheel", { deltaY: -500 });
    // cy.wait(600);
    // cy.get("svg")
    //   .find("text")
    //   .filter(":visible")
    //   .its("length")
    //   .should("be.gte", 1);
    // // Then zoom OUT again
    // cy.get("svg").trigger("wheel", { deltaY: 500 });
    // cy.wait(600);
  });
});
