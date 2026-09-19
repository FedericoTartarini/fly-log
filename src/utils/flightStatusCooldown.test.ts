import { describe, it, expect } from "vitest";
import { getFlightStatusCooldown } from "./flightStatusCooldown";
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
  flight_status: null,
  flight_status_checked_at: null,
};

describe("getFlightStatusCooldown", () => {
  it("allows checking immediately when never checked before", () => {
    const result = getFlightStatusCooldown(baseFlight, new Date("2026-09-01T00:00:00Z"));
    expect(result).toEqual({ allowed: true, nextCheckAt: null });
  });

  it("blocks re-checking within 24h when departure is far away", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      departure_date: "2026-10-01",
      flight_status: { status: "Expected" },
      flight_status_checked_at: "2026-09-01T00:00:00.000Z",
    };
    const result = getFlightStatusCooldown(flight, new Date("2026-09-01T10:00:00Z"));
    expect(result.allowed).toBe(false);
    expect(result.nextCheckAt).toEqual(new Date("2026-09-02T00:00:00.000Z"));
  });

  it("allows re-checking once 24h have passed", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      departure_date: "2026-10-01",
      flight_status: { status: "Expected" },
      flight_status_checked_at: "2026-09-01T00:00:00.000Z",
    };
    const result = getFlightStatusCooldown(flight, new Date("2026-09-02T00:00:01Z"));
    expect(result).toEqual({ allowed: true, nextCheckAt: null });
  });

  it("tightens to a 1h cooldown within 2h of departure", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      departure_date: "2026-09-01",
      departure_time: "12:00",
      flight_status: { status: "EnRoute" },
      flight_status_checked_at: "2026-09-01T10:30:00.000Z",
    };
    // now: 11:00 UTC, 1h since last check, departure at 12:00 is within 2h
    const result = getFlightStatusCooldown(flight, new Date("2026-09-01T11:00:00Z"));
    expect(result.allowed).toBe(false);
    expect(result.nextCheckAt).toEqual(new Date("2026-09-01T11:30:00.000Z"));
  });

  it("allows re-checking after the 1h near-departure cooldown elapses", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      departure_date: "2026-09-01",
      departure_time: "12:00",
      flight_status: { status: "EnRoute" },
      flight_status_checked_at: "2026-09-01T10:30:00.000Z",
    };
    const result = getFlightStatusCooldown(flight, new Date("2026-09-01T11:30:01Z"));
    expect(result.allowed).toBe(true);
  });

  it("locks out further checks once a terminal status has been observed", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      flight_status: { status: "Landed" },
      flight_status_checked_at: "2026-09-01T00:00:00.000Z",
    };
    // far in the future, well past any cooldown - still locked
    const result = getFlightStatusCooldown(flight, new Date("2027-01-01T00:00:00Z"));
    expect(result).toEqual({ allowed: false, nextCheckAt: null });
  });
});
