describe("StatsSummary Component", () => {
  beforeEach(() => {
    cy.visit("http://localhost:5173"); // Your dev server URL
  });

  it("should display flight statistics", () => {
    // Wait for the component to load
    cy.contains("Total Flights").should("be.visible");
    cy.contains("Distance (km)").should("be.visible");
    cy.contains("Time (days)").should("be.visible");
    cy.contains("Airports Visited").should("be.visible");
    cy.contains("Airlines Flown").should("be.visible");
    cy.contains("Countries").should("be.visible");
  });

  it("should display the correct statistics for all flights", () => {
    // Check if the statistics are displayed correctly
    cy.contains("26"); // Total Flights
    cy.contains("97,407"); // Distance (km)
    cy.contains("4.5"); // Time (days)
    cy.contains("20"); // Airports Visited
    cy.contains("11"); // Airlines Flown
    cy.contains("12"); // Countries

    // Check if a specific flight date is displayed
    cy.contains("01/07/2024"); // Check a specific flight date
  });

  it("should update statistics when year filter changes", () => {
    // Select a specific year from the dropdown
    cy.get("#flight-year-filter").select("2025");

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

    cy.contains("22/05/2025"); // Check a specific flight date for 2025
  });
});
