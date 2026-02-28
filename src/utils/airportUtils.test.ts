import { describe, expect, it, vi } from "vitest";

const getReferenceMapsSync = vi.fn();

vi.mock("./referenceData", () => ({
  getReferenceMapsSync: () => getReferenceMapsSync(),
}));

import { getAirportCity } from "./airportUtils";

describe("getAirportCity", () => {
  it("returns the airport city when available", () => {
    getReferenceMapsSync.mockReturnValue({
      airportByIata: new Map([["JFK", { city: "New York" }]]),
    });

    expect(getAirportCity("JFK")).toBe("New York");
  });

  it("strips parentheses and normalizes whitespace", () => {
    getReferenceMapsSync.mockReturnValue({
      airportByIata: new Map([["FCO", { city: "Rome (Lazio)" }]]),
    });

    expect(getAirportCity("FCO")).toBe("Rome");
  });

  it("falls back to IATA when city is missing", () => {
    getReferenceMapsSync.mockReturnValue({
      airportByIata: new Map(),
    });

    expect(getAirportCity("LHR")).toBe("LHR");
  });
});
