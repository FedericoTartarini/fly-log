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
}));

// Mock firebase app so the "!app" guard passes
vi.mock("../firebaseClient", () => ({
  app: { name: "test-app" },
}));

import { parseFlightFromText, REQUIRED_FIELDS } from "./flightAiParser";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wrap a JSON string in the shape Gemini returns */
const makeResponse = (json: string) => ({
  response: { text: () => json },
});

/** Build a complete valid payload */
const validPayload = () => ({
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  departure_date: "2026-07-10",
  departure_time: "09:00",
  airline_iata: "QF",
  flight_number: "1",
  return_date: null,
  return_time: null,
  return_flight_number: null,
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

  it("parses a complete outbound-only flight correctly", async () => {
    mockGenerateContent.mockResolvedValue(
      makeResponse(JSON.stringify(validPayload())),
    );

    const result = await parseFlightFromText(
      "I flew from Sydney to Singapore on 10 July with Qantas",
    );

    expect(result.departure_airport_iata).toBe("SYD");
    expect(result.arrival_airport_iata).toBe("SIN");
    expect(result.departure_date).toBe("2026-07-10");
    expect(result.departure_time).toBe("09:00");
    expect(result.airline_iata).toBe("QF");
    expect(result.flight_number).toBe("1");
    expect(result.return_date).toBeNull();
    expect(result.return_time).toBeNull();
    expect(result.return_flight_number).toBeNull();
  });

  it("parses a round-trip flight and populates return fields", async () => {
    const payload = {
      ...validPayload(),
      return_date: "2026-07-20",
      return_time: "14:30",
      return_flight_number: "2",
    };
    mockGenerateContent.mockResolvedValue(
      makeResponse(JSON.stringify(payload)),
    );

    const result = await parseFlightFromText(
      "Flew SYD to SIN on 10 July with Qantas, returning 20 July",
    );

    expect(result.return_date).toBe("2026-07-20");
    expect(result.return_time).toBe("14:30");
    expect(result.return_flight_number).toBe("2");
  });

  it("strips markdown code fences that Gemini may wrap around JSON", async () => {
    const json = `\`\`\`json\n${JSON.stringify(validPayload())}\n\`\`\``;
    mockGenerateContent.mockResolvedValue(makeResponse(json));

    const result = await parseFlightFromText("some flight");
    expect(result.departure_airport_iata).toBe("SYD");
  });

  it("strips plain code fences (no language tag)", async () => {
    const json = `\`\`\`\n${JSON.stringify(validPayload())}\n\`\`\``;
    mockGenerateContent.mockResolvedValue(makeResponse(json));

    const result = await parseFlightFromText("some flight");
    expect(result.departure_airport_iata).toBe("SYD");
  });

  it("throws when required fields are absent from the AI response", async () => {
    const partial = {
      departure_airport_iata: "JFK",
      arrival_airport_iata: null,
      departure_date: null,
      departure_time: null,
      airline_iata: null,
      flight_number: null,
      return_date: null,
      return_time: null,
      return_flight_number: null,
    };
    mockGenerateContent.mockResolvedValue(
      makeResponse(JSON.stringify(partial)),
    );

    await expect(parseFlightFromText("vague description")).rejects.toThrow(
      /missing required fields/i,
    );
  });

  it("throws when required fields are missing after normalization", async () => {
    const bad = {
      departure_airport_iata: 123, // should become null
      arrival_airport_iata: true, // should become null
      departure_date: "2026-07-10",
      departure_time: null,
      airline_iata: "QF",
      flight_number: null,
      return_date: null,
      return_time: null,
      return_flight_number: null,
    };
    mockGenerateContent.mockResolvedValue(makeResponse(JSON.stringify(bad)));

    await expect(parseFlightFromText("bad types")).rejects.toThrow(
      /missing required fields/i,
    );
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

  it("throws when the parsed JSON is a plain array", async () => {
    mockGenerateContent.mockResolvedValue(makeResponse("[]"));

    await expect(parseFlightFromText("edge case")).rejects.toThrow(
      /invalid response structure/i,
    );
  });
});
