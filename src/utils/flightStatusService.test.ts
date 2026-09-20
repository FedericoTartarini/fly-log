import { beforeEach, describe, expect, it, vi } from "vitest";

const flightServiceMocks = vi.hoisted(() => ({
  updateFlightForUser: vi.fn(),
}));

const firebaseClientMocks = vi.hoisted(() => ({
  getAppCheckToken: vi.fn(),
}));

vi.mock("./flightService", () => flightServiceMocks);
vi.mock("../firebaseClient", () => firebaseClientMocks);

import { checkFlightStatus, FlightStatusError } from "./flightStatusService";
import type { enhancedFlight } from "../types/enhancedFlight";

const baseFlight: enhancedFlight = {
  id: "1",
  departure_date: "2026-09-20",
  departure_time: "14:30",
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  airline_iata: "QF",
  flight_number: "1",
  airline_icao: null,
  departure_coordinates: null,
  arrival_coordinates: null,
  distance_km: null,
  flight_time: null,
  departure_country: null,
  arrival_country: null,
  international: false,
  airline_name: null,
  airline_icon_path: null,
};

describe("checkFlightStatus", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    flightServiceMocks.updateFlightForUser.mockReset();
    firebaseClientMocks.getAppCheckToken.mockReset();
    firebaseClientMocks.getAppCheckToken.mockResolvedValue("appcheck-token");
  });

  it("fetches the matching leg and saves it to Firestore", async () => {
    const legs = [
      {
        status: "Expected",
        departure: { airport: { iata: "SYD" } },
        arrival: { airport: { iata: "SIN" } },
      },
      {
        status: "Expected",
        departure: { airport: { iata: "MEL" } },
        arrival: { airport: { iata: "SIN" } },
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: () => Promise.resolve(legs) }),
    );

    const result = await checkFlightStatus("uid-1", baseFlight);

    expect(result).toEqual(legs[0]);
    expect(flightServiceMocks.updateFlightForUser).toHaveBeenCalledWith(
      "uid-1",
      "1",
      expect.objectContaining({ flight_status: legs[0] }),
    );
  });

  it("requests the flight number and ISO date it was built from", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toThrow(
      FlightStatusError,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/.netlify/functions/flight-status?flightNumber=QF1&date=2026-09-20",
      { headers: { "X-Firebase-AppCheck": "appcheck-token" } },
    );
  });

  it("does not call the proxy when no App Check token can be minted", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    firebaseClientMocks.getAppCheckToken.mockResolvedValue(null);

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toThrow(
      FlightStatusError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when no leg matches the flight's airports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              status: "Expected",
              departure: { airport: { iata: "MEL" } },
              arrival: { airport: { iata: "SIN" } },
            },
          ]),
      }),
    );

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toThrow(
      FlightStatusError,
    );
    expect(flightServiceMocks.updateFlightForUser).not.toHaveBeenCalled();
  });

  it("throws without calling fetch when the flight has no flight number", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      checkFlightStatus("uid-1", { ...baseFlight, flight_number: null }),
    ).rejects.toThrow(FlightStatusError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a FlightStatusError, not a SyntaxError, when the body is not JSON", async () => {
    // What a dev server with no function mounted actually returns: 200 with
    // the SPA shell.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
      }),
    );

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toThrow(
      FlightStatusError,
    );
    expect(flightServiceMocks.updateFlightForUser).not.toHaveBeenCalled();
  });

  it("throws a FlightStatusError, not a TypeError, when the body is not an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: "something else entirely" }),
      }),
    );

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toThrow(
      FlightStatusError,
    );
    expect(flightServiceMocks.updateFlightForUser).not.toHaveBeenCalled();
  });

  it("surfaces AeroDataBox's own status when the proxy answers with JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: "quota exceeded" }),
      }),
    );

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toMatchObject({
      name: "FlightStatusError",
      status: 429,
    });
    expect(flightServiceMocks.updateFlightForUser).not.toHaveBeenCalled();
  });

  it("reports a non-JSON error body as a proxy problem, not a missing flight", async () => {
    // netlify dev with no function mounted answers a bare 404. Reporting that
    // as 404 "no matching flight" sends you looking in the wrong place.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
      }),
    );

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toMatchObject({
      name: "FlightStatusError",
      status: 502,
    });
    expect(flightServiceMocks.updateFlightForUser).not.toHaveBeenCalled();
  });
});
