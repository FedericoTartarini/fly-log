/* global describe, it, beforeEach, cy */

describe("Landing Page", () => {
  beforeEach(() => {
    // An earlier spec signs in, and Firebase keeps that session in IndexedDB,
    // which Cypress does not clear between specs. A signed-in visitor is sent
    // on to /stats, so start signed out.
    cy.visit("/", {
      onBeforeLoad(win) {
        win.indexedDB.deleteDatabase("firebaseLocalStorageDb");
      },
    });
    // The build prerenders this page, so cy.contains matches before React has
    // adopted it and framer-motion can reveal anything. The header's Login
    // button only appears once React runs and auth reports no user.
    cy.contains("header a", "Login", { timeout: 10000 }).should("be.visible");
  });

  it("shows the hero, the example log and every feature", () => {
    cy.contains("h1", "Every flight you take, logged and mapped.").should(
      "be.visible",
    );
    cy.contains("a", "Start your log").should("be.visible");
    cy.contains("Twice the distance to the Moon").should("be.visible");

    // "See what it shows" jumps to the feature list.
    cy.contains("a", "See what it shows").click();
    [
      "Where did you fly?",
      "How far did you fly?",
      "When did you fly?",
      "Every flight, searchable",
      "Live flight status",
      "Collect badges",
    ].forEach((title) => {
      cy.contains(title, { timeout: 2000 }).should("be.visible");
    });
  });

  it("draws the trip on the globe while the tour section is pinned", () => {
    cy.contains("h2", "Replay your travels on a globe.").scrollIntoView();
    cy.get('[aria-label^="A globe tracing a trip"]', { timeout: 5000 }).should(
      "exist",
    );
  });
});
