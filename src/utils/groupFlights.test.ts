import { describe, it, expect } from "vitest";
import { groupFlightsByYear } from "./groupFlights";
import type { enhancedFlight } from "../types/enhancedFlight";

const flight = (id: string, departure_date: unknown, distance_km = 100) =>
  ({ id, departure_date, distance_km }) as unknown as enhancedFlight;

const summary = (flights: enhancedFlight[], now: Date) =>
  groupFlightsByYear(flights, now).map((g) => ({
    key: g.key,
    ids: g.flights.map((f) => f.id),
    km: g.km,
  }));

describe("groupFlightsByYear", () => {
  const now = new Date(2026, 10, 8, 15, 0); // 8 Nov 2026, 3 pm local

  it("puts upcoming flights first, then one group per year, newest first", () => {
    const flights = [
      flight("a", "2025-03-01"),
      flight("b", "2026-11-11", 6293),
      flight("c", "2026-07-06"),
      flight("d", "2026-11-18", 6293),
      flight("e", "2025-12-20"),
    ];
    expect(summary(flights, now)).toEqual([
      { key: "upcoming", ids: ["d", "b"], km: 12586 },
      { key: 2026, ids: ["c"], km: 100 },
      { key: 2025, ids: ["e", "a"], km: 200 },
    ]);
  });

  it("counts a flight departing today as upcoming", () => {
    const groups = groupFlightsByYear([flight("a", "2026-11-08")], now);
    expect(groups[0].key).toBe("upcoming");
  });

  it("reads the year from the calendar day, not the local time", () => {
    // Stored as UTC midnight: local time west of UTC reads 31 Dec 2024.
    const groups = groupFlightsByYear(
      [flight("a", new Date("2025-01-01T00:00:00Z"))],
      now,
    );
    expect(groups[0].key).toBe(2025);
  });

  it("keeps flights with no readable date in a last group", () => {
    const flights = [flight("a", null), flight("b", "2024-05-01")];
    expect(summary(flights, now).map((g) => g.key)).toEqual([2024, null]);
  });

  it("skips missing distances in the total", () => {
    const flights = [
      flight("a", "2024-05-01"),
      flight("b", "2024-04-01", null as unknown as number),
    ];
    expect(groupFlightsByYear(flights, now)[0].km).toBe(100);
  });
});
