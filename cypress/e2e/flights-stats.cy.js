describe("StatsSummary Component", () => {
  beforeEach(() => {
    cy.visit("http://localhost:5173/login");
    cy.get('input[name="email"]').type(Cypress.env("email"));
    cy.get('input[name="password"]').type(Cypress.env("password"));
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/stats");
    cy.contains("Welcome to My Flight Tracker").should("be.visible");
  });

  it("should display the correct statistics for all flights", () => {
    cy.scrollTo(0, 500);
    // Verify the presence of key statistics
    cy.contains("Total Flights").should("be.visible");
    cy.contains("All Past Flights").should("be.visible");
    cy.contains("Add New Flight").should("be.visible");

    // Check if the statistics are displayed correctly
    cy.contains("30,304").should("be.visible"); // Distance (km)
    cy.contains("1.4").should("be.visible"); // Time (days)
    cy.contains("2").should("be.visible"); // Airlines Flown
  });

  it("should update statistics when year filter changes", () => {
    cy.scrollTo(0, 500);
    // Select a specific year from the dropdown
    cy.get("#flight-year-filter").select("2025");

    // Verify statistics update
    cy.contains("Total Flights").should("be.visible");
    cy.contains("Distance (km)").should("be.visible");
    cy.contains("Time (days)").should("be.visible");
    cy.contains("Airports Visited").should("be.visible");
    cy.contains("Airlines Flown").should("be.visible");
    cy.contains("Countries").should("be.visible");

    cy.contains("12,801"); // Distance (km) for 2025
    cy.contains("0.6"); // Time (days) for 2025
    cy.contains("3"); // Airports Visited for 2025
  });

  it("should update statistics when year filter changes", () => {
    // Select a specific year from the dropdown
    cy.scrollTo("bottom", { duration: 1000 });

    // Verify statistics update
    cy.contains("Total Flights").should("be.visible");
    cy.contains("Distance (km)").should("be.visible");
    cy.contains("Time (days)").should("be.visible");
    cy.contains("Airports Visited").should("be.visible");
    cy.contains("Airlines Flown").should("be.visible");
    cy.contains("Countries").should("be.visible");

    cy.contains("9"); // Total Flights for 2025
    cy.contains("38,607"); // Distance (km) for 2025
    cy.contains("1.8"); // Time (days) for 2025
    cy.contains("8"); // Airports Visited for 2025
    cy.contains("4"); // Airlines Flown for 2025
    cy.contains("6"); // Countries for 2025
  });
});
