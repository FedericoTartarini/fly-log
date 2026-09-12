/* global describe, it, beforeEach, cy */

describe("Landing Page", () => {
  beforeEach(() => {
    cy.visit("/");
    // index.html seeds #root with the same landing copy so crawlers can index
    // it, which means cy.contains matches before React mounts. Scrolling then
    // runs against a layout that is about to be thrown away, and the cards
    // never enter the viewport for framer-motion's whileInView. Wait for a
    // Mantine-rendered node, which only exists once Landing has hydrated.
    cy.get(".mantine-Title-root", { timeout: 10000 }).should("exist");
  });

  /**
   * Test that all flight statistics features are visible on the landing page.
   */
  it("should display flight statistics", () => {
    cy.contains("Welcome to Your Personal Flight Tracker").should("be.visible");
    cy.contains("Get Started").should("be.visible");
    cy.contains("Learn More").should("be.visible");

    // Scroll down in steps to trigger all animations
    cy.scrollTo("center", { duration: 200 });
    cy.wait(200);
    cy.scrollTo("bottom", { duration: 200 });
    cy.wait(200);

    // Assert all feature cards are visible
    cy.contains("What are your stats?", { timeout: 2000 }).should("be.visible");
    cy.contains("How far did you fly?", { timeout: 2000 }).should("be.visible");
    cy.contains("Where did you fly?", { timeout: 2000 }).should("be.visible");
    cy.contains("Flight Details", { timeout: 2000 }).should("be.visible");
    cy.contains("When did you fly?", { timeout: 2000 }).should("be.visible");
    cy.contains("Which countries did you visit?", { timeout: 2000 }).should(
      "be.visible",
    );
  });
});
