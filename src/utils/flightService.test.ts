import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreState = vi.hoisted(() => ({
  instance: { name: "test-firestore" } as unknown,
}));

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(() => ({ name: "collection" })),
  query: vi.fn((...args: unknown[]) => ({ args })),
  where: vi.fn((...args: unknown[]) => ({ args })),
  orderBy: vi.fn((...args: unknown[]) => ({ args })),
  getDocs: vi.fn(),
  doc: vi.fn((...args: unknown[]) => ({ path: args })),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
    })),
  },
}));

vi.mock("firebase/firestore", () => firestoreMocks);

vi.mock("../firebaseClient", () => ({
  get firestore() {
    return firestoreState.instance;
  },
}));

const referenceDataMocks = vi.hoisted(() => ({
  loadReferenceMaps: vi.fn(),
  getReferenceMapsSync: vi.fn(),
}));

vi.mock("./referenceData", () => ({
  loadReferenceMaps: (...args: unknown[]) =>
    referenceDataMocks.loadReferenceMaps(...args),
  getReferenceMapsSync: () => referenceDataMocks.getReferenceMapsSync(),
}));

import {
  enrichFlightData,
  getFilteredUserFlights,
  updateFlightForUser,
} from "./flightService";
import { YEAR_FILTER } from "../constants/filters";

describe("flightService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreState.instance = { name: "test-firestore" };
    referenceDataMocks.loadReferenceMaps.mockResolvedValue({});
  });

  it("enrichFlightData merges reference data and computes distance", () => {
    const airportByIata = new Map([
      [
        "SYD",
        {
          iata: "SYD",
          airport_name: "Sydney",
          city: "Sydney",
          country: "Australia",
          lat: -33.9399,
          lon: 151.1753,
          iso_country: "AU",
          iso_region: "AU-NSW",
          elevation: 21,
        },
      ],
      [
        "SIN",
        {
          iata: "SIN",
          airport_name: "Changi",
          city: "Singapore",
          country: "Singapore",
          lat: 1.3644,
          lon: 103.9915,
          iso_country: "SG",
          iso_region: "SG-01",
          elevation: 7,
        },
      ],
    ]);
    const airlineByIata = new Map([
      ["QF", { iata: "QF", name: "Qantas", icao: "QFA" }],
    ]);
    referenceDataMocks.getReferenceMapsSync.mockReturnValue({
      airportByIata,
      airlineByIata,
    });

    const flight = {
      id: "1",
      departure_date: "2026-07-10",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "SIN",
      airline_iata: "QF",
    };

    const enriched = enrichFlightData(flight);

    expect(enriched.departure_coordinates).toEqual([-33.9399, 151.1753]);
    expect(enriched.arrival_coordinates).toEqual([1.3644, 103.9915]);
    expect(enriched.distance_km).toBeGreaterThan(0);
    expect(enriched.flight_time).toBeGreaterThan(0);
    expect(enriched.airline_name).toBe("Qantas");
    expect(enriched.airline_icon_path).toBe("QFA.png");
    expect(enriched.international).toBe(true);
  });

  it("getFilteredUserFlights throws when Firestore is not initialized", async () => {
    firestoreState.instance = null;
    await expect(
      getFilteredUserFlights("uid-1", YEAR_FILTER.ALL),
    ).rejects.toThrow(/Firestore is not initialized/i);
  });

  it("getFilteredUserFlights loads, enriches, and returns flight records", async () => {
    const airportByIata = new Map([
      [
        "JFK",
        {
          iata: "JFK",
          airport_name: "JFK",
          city: "New York",
          country: "United States",
          lat: 40.6413,
          lon: -73.7781,
          iso_country: "US",
          iso_region: "US-NY",
          elevation: 13,
        },
      ],
      [
        "LHR",
        {
          iata: "LHR",
          airport_name: "Heathrow",
          city: "London",
          country: "United Kingdom",
          lat: 51.47,
          lon: -0.4543,
          iso_country: "GB",
          iso_region: "GB-LND",
          elevation: 83,
        },
      ],
    ]);
    const airlineByIata = new Map([
      ["BA", { iata: "BA", name: "British Airways", icao: "BAW" }],
    ]);
    referenceDataMocks.getReferenceMapsSync.mockReturnValue({
      airportByIata,
      airlineByIata,
    });

    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "flight-1",
          data: () => ({
            departure_date: "2025-01-10",
            departure_airport_iata: "JFK",
            arrival_airport_iata: "LHR",
            airline_iata: "BA",
          }),
        },
      ],
    });

    const result = await getFilteredUserFlights("uid-1", YEAR_FILTER.ALL);

    expect(referenceDataMocks.loadReferenceMaps).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    const [first] = result;
    expect(first?.airline_name).toBe("British Airways");
    expect(first?.airline_icon_path).toBe("BAW.png");
  });

  it("updateFlightForUser throws on invalid departure_date", async () => {
    await expect(
      updateFlightForUser("uid-1", "flight-1", {
        departure_date: "not-a-date",
      }),
    ).rejects.toThrow(/Invalid departure_date/i);

    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });
});
