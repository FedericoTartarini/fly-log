/* global beforeEach, cy */

// The emulators cover Auth and Firestore only. Flight status (AeroDataBox,
// through the Netlify function) and the flight parser (Gemini, through
// Firebase AI) are paid outside services, so no spec may reach them. The test
// build has no reCAPTCHA key either, so App Check gives no token, and a spec
// that needs one of these features must stub its reply here or in the spec.
beforeEach(() => {
  cy.intercept("/.netlify/functions/**", {
    statusCode: 503,
    body: { error: "Stubbed in Cypress" },
  });
  cy.intercept("https://firebasevertexai.googleapis.com/**", {
    statusCode: 503,
    body: { error: { message: "Stubbed in Cypress" } },
  });
});
