describe("StatsSummary Component", () => {
  beforeEach(() => {
    cy.visit("http://localhost:5173"); // Your dev server URL
  });

  it("should display flight statistics", () => {
    // Wait for the component to load
    cy.contains("Welcome to Your Personal Flight Tracker").should("be.visible");
    cy.contains("Get Started").should("be.visible");
    cy.contains("Learn More").should("be.visible");
    cy.scrollTo("bottom", { duration: 100 });
    cy.contains("What are your stats?").should("be.visible");
    cy.contains("How far did you fly?").should("be.visible");
    cy.contains("Where did you fly?").should("be.visible");
    cy.contains("Flight Details").should("be.visible");
    cy.contains("When did you fly?").should("be.visible");
  });
});
