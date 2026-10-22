/**
 * Unit tests for flightAiParser.ts
 *
 * The firebase/ai module is mocked so no real network calls are made.
 * Each test controls what `generateContent` returns and verifies that
 * parseFlightFromText correctly maps / validates the response.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock firebase/ai before importing the module under test ─────────────────
const mockGenerateContent = vi.fn();

vi.mock("firebase/ai", () => ({
  getAI: vi.fn(() => ({})),
  getGenerativeModel: vi.fn(() => ({
    generateContent: mockGenerateContent,
  })),
  // The schema only configures Gemini, so its exact shape does not matter here.
  Schema: { object: vi.fn(), array: vi.fn(), string: vi.fn() },
}));

// Mock firebase app so the "!app" guard passes
vi.mock("../firebaseClient", () => ({
  app: { name: "test-app" },
  ensureAppCheck: vi.fn(() => Promise.resolve()),
}));

import { parseFlightFromText, REQUIRED_FIELDS } from "./flightAiParser";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wrap a JSON string in the shape Gemini returns */
const makeResponse = (json: string) => ({
  response: { text: () => json },
});

/** Wrap legs in the {"flights": [...]} object Gemini is asked for */
const flightsResponse = (...legs: unknown[]) =>
  makeResponse(JSON.stringify({ flights: legs }));

/** Build a complete valid leg */
const validLeg = (overrides: Record<string, unknown> = {}) => ({
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  departure_date: "2026-07-10",
  departure_time: "09:00",
  airline_iata: "QF",
  flight_number: "1",
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("REQUIRED_FIELDS", () => {
  it("contains the four mandatory fields", () => {
    expect(REQUIRED_FIELDS).toContain("departure_airport_iata");
    expect(REQUIRED_FIELDS).toContain("arrival_airport_iata");
    expect(REQUIRED_FIELDS).toContain("departure_date");
    expect(REQUIRED_FIELDS).toContain("airline_iata");
    expect(REQUIRED_FIELDS).toHaveLength(4);
  });
});

describe("parseFlightFromText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a single flight into a one-leg list", async () => {
    mockGenerateContent.mockResolvedValue(flightsResponse(validLeg()));

    const result = await parseFlightFromText(
      "I flew from Sydney to Singapore on 10 July with Qantas",
    );

    expect(result).toEqual([validLeg()]);
  });

  it("parses a multi-city round trip into one leg per flight, in order", async () => {
    const legs = [
      validLeg({
        departure_airport_iata: "IAD",
        arrival_airport_iata: "LAX",
        departure_date: "2026-12-01",
        departure_time: null,
        airline_iata: "UA",
        flight_number: null,
      }),
      validLeg({
        departure_airport_iata: "LAX",
        arrival_airport_iata: "SYD",
        departure_date: "2026-12-01",
        departure_time: null,
        airline_iata: "UA",
        flight_number: null,
      }),
      validLeg({
        departure_airport_iata: "SYD",
        arrival_airport_iata: "SFO",
        departure_date: "2027-01-10",
        departure_time: null,
        airline_iata: "UA",
        flight_number: null,
      }),
      validLeg({
        departure_airport_iata: "SFO",
        arrival_airport_iata: "DCA",
        departure_date: "2027-01-10",
        departure_time: null,
        airline_iata: "UA",
        flight_number: null,
      }),
    ];
    mockGenerateContent.mockResolvedValue(flightsResponse(...legs));

    const result = await parseFlightFromText(
      "Washington to LA to Sydney on 1 Dec with United, back on 10 Jan via San Francisco to Reagan",
    );

    expect(
      result.map(
        (f) => `${f.departure_airport_iata}-${f.arrival_airport_iata}`,
      ),
    ).toEqual(["IAD-LAX", "LAX-SYD", "SYD-SFO", "SFO-DCA"]);
    expect(result[3]?.departure_date).toBe("2027-01-10");
  });

  it("normalizes each leg's fields", async () => {
    mockGenerateContent.mockResolvedValue(
      flightsResponse(
        validLeg({
          departure_airport_iata: " syd ",
          departure_time: "9:05",
          airline_iata: "qf",
          flight_number: "QF1", // not digits only → null
        }),
      ),
    );

    const [leg] = await parseFlightFromText("some flight");
    expect(leg?.departure_airport_iata).toBe("SYD");
    expect(leg?.departure_time).toBe("09:05");
    expect(leg?.airline_iata).toBe("QF");
    expect(leg?.flight_number).toBeNull();
  });

  it("keeps legs with missing dates or airlines so the form can ask for them", async () => {
    mockGenerateContent.mockResolvedValue(
      flightsResponse(validLeg({ departure_date: null, airline_iata: null })),
    );

    const [leg] = await parseFlightFromText("SYD to SIN sometime");
    expect(leg?.departure_date).toBeNull();
    expect(leg?.airline_iata).toBeNull();
  });

  it("keeps a leg missing one airport so the user is told, not left guessing", async () => {
    mockGenerateContent.mockResolvedValue(
      flightsResponse(
        validLeg(),
        validLeg({ departure_airport_iata: "SIN", arrival_airport_iata: 123 }),
      ),
    );

    const result = await parseFlightFromText("two flights");
    expect(result).toHaveLength(2);
    expect(result[1]?.arrival_airport_iata).toBeNull();
  });

  it("drops legs with no airport at all, and non-objects", async () => {
    mockGenerateContent.mockResolvedValue(
      flightsResponse(
        validLeg(),
        validLeg({ departure_airport_iata: null, arrival_airport_iata: null }),
        "not a leg",
      ),
    );

    const result = await parseFlightFromText("two flights");
    expect(result).toHaveLength(1);
  });

  it("throws when no leg has any airport", async () => {
    mockGenerateContent.mockResolvedValue(
      flightsResponse(
        validLeg({ departure_airport_iata: null, arrival_airport_iata: null }),
      ),
    );

    await expect(parseFlightFromText("vague description")).rejects.toThrow(
      /could not find any flights/i,
    );
  });

  it("strips markdown code fences that Gemini may wrap around JSON", async () => {
    const json = `\`\`\`json\n${JSON.stringify({ flights: [validLeg()] })}\n\`\`\``;
    mockGenerateContent.mockResolvedValue(makeResponse(json));

    const [leg] = await parseFlightFromText("some flight");
    expect(leg?.departure_airport_iata).toBe("SYD");
  });

  it("throws a descriptive error when the response is not valid JSON", async () => {
    mockGenerateContent.mockResolvedValue(
      makeResponse("Sorry, I cannot help with that."),
    );

    await expect(parseFlightFromText("garbage")).rejects.toThrow(
      /unexpected response/i,
    );
  });

  it("throws when the parsed JSON is not an object (e.g. a bare string)", async () => {
    mockGenerateContent.mockResolvedValue(makeResponse('"just a string"'));

    await expect(parseFlightFromText("edge case")).rejects.toThrow(
      /invalid response structure/i,
    );
  });

  it("throws when the object has no flights array", async () => {
    mockGenerateContent.mockResolvedValue(
      makeResponse(JSON.stringify(validLeg())),
    );

    await expect(parseFlightFromText("old shape")).rejects.toThrow(
      /invalid response structure/i,
    );
  });
});
