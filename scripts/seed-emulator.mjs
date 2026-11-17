// Creates the Cypress test user and a fixed set of flights in the Auth and
// Firestore emulators, so the e2e specs can assert exact numbers. Run inside
// `firebase emulators:exec` (see "test:e2e:emulator" in package.json).
import { readFile } from "node:fs/promises";

const project = "demo-fly-log";
const { email, password } = JSON.parse(
  await readFile(
    new URL("../cypress/fixtures/test-user.json", import.meta.url),
  ),
);

// The Auth emulator accepts any API key.
const signUp = await fetch(
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  },
);
if (!signUp.ok) throw new Error(`Sign-up failed: ${await signUp.text()}`);
const { localId: uid } = await signUp.json();

// 4 flights, 4 airports, 3 countries, 2 airlines, 34,642 km. The last one is
// far in the future, so the Upcoming filter always has something to show.
const flights = [
  ["2024-03-10", "SYD", "MEL", "QF", "401"],
  ["2024-07-02", "MEL", "SIN", "SQ", "218"],
  ["2025-01-15", "SIN", "LHR", "SQ", "322"],
  ["2099-06-01", "LHR", "SYD", "QF", "2"],
];
for (const [date, from, to, airline, number] of flights) {
  const res = await fetch(
    `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents/flights/${uid}/records`,
    {
      method: "POST",
      // "owner" is the emulator's admin token, which skips the rules.
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({
        fields: {
          departure_date: { timestampValue: `${date}T00:00:00Z` },
          departure_airport_iata: { stringValue: from },
          arrival_airport_iata: { stringValue: to },
          airline_iata: { stringValue: airline },
          flight_number: { stringValue: number },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Adding a flight failed: ${await res.text()}`);
}
console.log(`Seeded ${email} with ${flights.length} flights`);
