import { describe, expect, it, vi } from "vitest";

const referenceDataMocks = vi.hoisted(() => ({
  loadReferenceMaps: vi.fn(),
  getReferenceMapsSync: vi.fn(),
}));

vi.mock("./referenceData", () => referenceDataMocks);

import {
  ENRICHMENT_VERSION,
  deriveFlightFields,
  derivedFieldsForWrite,
  isEnriched,
} from "./flightEnrichment";

const maps = {
  airportByIata: new Map([
    ["SYD", { lat: -33.94, lon: 151.18, iso_country: "AU" }],
    ["MEL", { lat: -37.67, lon: 144.84, iso_country: "AU" }],
  ]),
  airlineByIata: new Map([["QF", { iata: "QF", name: "Qantas", icao: "QFA" }]]),
} as unknown as Parameters<typeof deriveFlightFields>[1];

const flight = {
  departure_airport_iata: "SYD",
  arrival_airport_iata: "MEL",
  airline_iata: "QF",
};

describe("flightEnrichment", () => {
  it("estimates the time in the air from the distance without a status check", () => {
    const derived = deriveFlightFields(flight, maps);
    expect(derived.international).toBe(false);
    expect(derived.flight_time).toBeCloseTo((derived.distance_km ?? 0) / 900);
    expect(derived.enrichment_version).toBe(ENRICHMENT_VERSION);
  });

  it("leaves unknown airports and airlines as null", () => {
    const derived = deriveFlightFields(
      {
        departure_airport_iata: "XXX",
        arrival_airport_iata: "MEL",
        airline_iata: "ZZ",
      },
      maps,
    );
    expect(derived.departure_coordinates).toBeNull();
    expect(derived.distance_km).toBeNull();
    expect(derived.flight_time).toBeNull();
    expect(derived.co2_kg).toBe(0);
    expect(derived.airline_name).toBeNull();
  });

  it("treats a missing or older enrichment version as not enriched", () => {
    expect(isEnriched({})).toBe(false);
    expect(isEnriched({ enrichment_version: null })).toBe(false);
    expect(isEnriched({ enrichment_version: ENRICHMENT_VERSION - 1 })).toBe(
      false,
    );
    expect(isEnriched({ enrichment_version: ENRICHMENT_VERSION })).toBe(true);
  });

  it("still lets a flight be saved when reference data cannot load", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    referenceDataMocks.loadReferenceMaps.mockRejectedValue(
      new Error("offline"),
    );
    await expect(derivedFieldsForWrite(flight)).resolves.toEqual({
      enrichment_version: null,
    });
  });

  it("derives the fields for a write once reference data loads", async () => {
    referenceDataMocks.loadReferenceMaps.mockResolvedValue(maps);
    referenceDataMocks.getReferenceMapsSync.mockReturnValue(maps);
    await expect(derivedFieldsForWrite(flight)).resolves.toMatchObject({
      airline_name: "Qantas",
      enrichment_version: ENRICHMENT_VERSION,
    });
  });
});
