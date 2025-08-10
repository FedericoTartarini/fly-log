describe("StatsSummary Component", () => {
  beforeEach(() => {
    cy.visit("http://localhost:5173/login");
    cy.get('input[name="email"]').type("testuser@example.com");
    cy.get('input[name="password"]').type("yourPassword123");
    cy.get('button[type="submit"]').click();
  });

  it("should display invalid login credentials", () => {
    cy.contains("Invalid login credentials").should("be.visible");
  });
});
