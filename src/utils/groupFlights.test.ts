import { describe, it, expect } from "vitest";
import { groupFlights, type FlightSort } from "./groupFlights";
import type { enhancedFlight } from "../types/enhancedFlight";

const flight = (id: string, departure_date: unknown, distance_km = 100) =>
  ({ id, departure_date, distance_km }) as unknown as enhancedFlight;

const summary = (
  flights: enhancedFlight[],
  now: Date,
  sort: FlightSort = "newest",
) =>
  groupFlights(flights, sort, now).map((g) => ({
    key: g.key,
    ids: g.flights.map((f) => f.id),
    km: g.km,
  }));

describe("groupFlights", () => {
  const now = new Date(2026, 10, 8, 15, 0); // 8 Nov 2026, 3 pm local

  it("puts upcoming flights first, soonest first, then one group per year, newest first", () => {
    const flights = [
      flight("a", "2025-03-01"),
      flight("b", "2026-11-11", 6293),
      flight("c", "2026-07-06"),
      flight("d", "2026-11-18", 6293),
      flight("e", "2025-12-20"),
    ];
    expect(summary(flights, now)).toEqual([
      { key: "upcoming", ids: ["b", "d"], km: 12586 },
      { key: 2026, ids: ["c"], km: 100 },
      { key: 2025, ids: ["e", "a"], km: 200 },
    ]);
  });

  it("counts a flight departing today as upcoming", () => {
    const groups = groupFlights([flight("a", "2026-11-08")], "newest", now);
    expect(groups[0].key).toBe("upcoming");
  });

  it("reads the year from the calendar day, not the local time", () => {
    // Stored as UTC midnight: local time west of UTC reads 31 Dec 2024.
    const groups = groupFlights(
      [flight("a", new Date("2025-01-01T00:00:00Z"))],
      "newest",
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
    expect(groupFlights(flights, "newest", now)[0].km).toBe(100);
  });

  describe("sort orders", () => {
    const flights = [
      flight("a", "2025-03-01", 700),
      flight("b", "2026-11-11", 6293),
      flight("c", "2026-07-06", 13581),
      flight("d", "2026-11-18", 163),
      flight("e", "2025-12-20", null as unknown as number),
      flight("f", null, 700),
    ];

    it("Oldest runs the years forwards and puts upcoming flights last", () => {
      expect(summary(flights, now, "oldest")).toEqual([
        { key: 2025, ids: ["a", "e"], km: 700 },
        { key: 2026, ids: ["c"], km: 13581 },
        { key: "upcoming", ids: ["b", "d"], km: 6456 },
        { key: null, ids: ["f"], km: 700 },
      ]);
    });

    it("Longest is one group, flights with no distance last, ties newest first", () => {
      expect(summary(flights, now, "longest")).toEqual([
        {
          key: "longest",
          ids: ["c", "b", "a", "f", "d", "e"],
          km: 21437,
        },
      ]);
    });

    it("Shortest is one group, flights with no distance still last", () => {
      expect(summary(flights, now, "shortest")[0].ids).toEqual([
        "d",
        "a",
        "f",
        "b",
        "c",
        "e",
      ]);
    });

    it("returns no groups for no flights", () => {
      expect(groupFlights([], "longest", now)).toEqual([]);
    });
  });
});
