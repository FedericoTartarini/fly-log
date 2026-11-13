/* global describe, it, beforeEach, cy */

describe("Landing Page", () => {
  beforeEach(() => {
    cy.visit("/");
    // index.html seeds #root with the same landing copy so crawlers can index
    // it, which means cy.contains matches before React mounts. Scrolling then
    // runs against a layout that is about to be thrown away, and the features
    // never enter the viewport for framer-motion's whileInView. Wait for
    // #features, which only exists once Landing has hydrated.
    cy.get("#features", { timeout: 10000 }).should("exist");
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
