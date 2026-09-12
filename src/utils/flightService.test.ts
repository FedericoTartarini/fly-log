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
  onSnapshot: vi.fn(() => vi.fn()),
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
  subscribeToUserFlights,
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
    // Emissions are computed here, once, not at render time.
    expect(enriched.co2_kg).toBeGreaterThan(0);
    expect(enriched.co2_kg).toBeLessThan(enriched.distance_km as number);
  });

  it("subscribeToUserFlights reports an error when Firestore is not initialized", async () => {
    firestoreState.instance = null;
    const onError = vi.fn();

    subscribeToUserFlights("uid-1", YEAR_FILTER.ALL, vi.fn(), onError);

    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError.mock.calls[0]?.[0]?.message).toMatch(
      /Firestore is not initialized/i,
    );
  });

  it("subscribeToUserFlights emits enriched flights when the snapshot fires", async () => {
    referenceDataMocks.getReferenceMapsSync.mockReturnValue({
      airportByIata: new Map(),
      airlineByIata: new Map([["BA", { iata: "BA", name: "BA", icao: "BAW" }]]),
    });

    const unsubscribeSpy = vi.fn();
    firestoreMocks.onSnapshot.mockImplementation(
      (_q: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          docs: [{ id: "flight-1", data: () => ({ airline_iata: "BA" }) }],
        });
        return unsubscribeSpy;
      },
    );

    const onFlights = vi.fn();
    const onError = vi.fn();
    const unsubscribe = subscribeToUserFlights(
      "uid-1",
      YEAR_FILTER.ALL,
      onFlights,
      onError,
    );

    // The listener attaches only once reference data resolves.
    await vi.waitFor(() => expect(onFlights).toHaveBeenCalledOnce());
    expect(onError).not.toHaveBeenCalled();
    expect(onFlights.mock.calls[0]?.[0]?.[0]?.airline_name).toBe("BA");

    unsubscribe();
    expect(unsubscribeSpy).toHaveBeenCalledOnce();
  });

  it("subscribeToUserFlights does not attach if unsubscribed before reference data resolves", async () => {
    let resolveMaps: (() => void) | undefined;
    referenceDataMocks.loadReferenceMaps.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveMaps = resolve;
      }),
    );

    const onFlights = vi.fn();
    const unsubscribe = subscribeToUserFlights(
      "uid-1",
      YEAR_FILTER.ALL,
      onFlights,
      vi.fn(),
    );

    unsubscribe();
    resolveMaps?.();
    await Promise.resolve();

    expect(firestoreMocks.onSnapshot).not.toHaveBeenCalled();
    expect(onFlights).not.toHaveBeenCalled();
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
