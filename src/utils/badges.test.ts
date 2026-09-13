import { describe, it, expect } from "vitest";
import {
  evaluateBadges,
  sortForShelf,
  pickStripBadges,
  BADGE_DEFS,
} from "./badges";
import type { enhancedFlight } from "../types/enhancedFlight";

const NOW = new Date("2026-06-01T00:00:00Z");

// Only the fields the badges actually read; the rest of enhancedFlight is
// irrelevant here and would make each case unreadable.
const flight = (
  departure_date: string,
  overrides: Partial<enhancedFlight> = {},
): enhancedFlight =>
  ({
    id: departure_date,
    departure_date,
    departure_airport_iata: "SYD",
    arrival_airport_iata: "MEL",
    departure_country: "AU",
    arrival_country: "AU",
    distance_km: 705,
    ...overrides,
  }) as enhancedFlight;

const byId = (flights: enhancedFlight[], id: string) =>
  evaluateBadges(flights, NOW).find((badge) => badge.id === id)!;

describe("evaluateBadges", () => {
  it("ignores flights that have not departed yet", () => {
    const booked = byId([flight("2026-09-14")], "first_flight");
    expect(booked.unlocked).toBe(false);

    // ...and they contribute nothing to progress either.
    const distance = byId(
      [flight("2026-09-14", { distance_km: 40_075 })],
      "once_around",
    );
    expect(distance.current).toBe(0);
  });

  it("stamps the badge with the flight that crossed the threshold", () => {
    const flights = [
      flight("2020-01-10", { distance_km: 30_000 }),
      flight("2021-05-20", { distance_km: 15_000 }), // crosses 40,075 km here
      flight("2022-08-30", { distance_km: 9_000 }),
    ];
    const badge = byId(flights, "once_around");

    expect(badge.unlocked).toBe(true);
    expect(badge.unlockedOn?.toISOString().slice(0, 10)).toBe("2021-05-20");
  });

  it("counts a streak across a year boundary", () => {
    const flights = [
      flight("2024-11-05"),
      flight("2024-12-05"),
      flight("2025-01-05"),
    ];
    expect(byId(flights, "on_a_roll").current).toBe(3);
  });

  it("does not extend a streak through a missing month", () => {
    const flights = [
      flight("2024-11-05"),
      flight("2024-12-05"),
      flight("2025-02-05"), // January missing, so the run restarts
    ];
    expect(byId(flights, "on_a_roll").current).toBe(2);
  });

  it("counts consecutive years, not merely distinct ones", () => {
    const consecutive = [
      flight("2020-04-02"),
      flight("2021-04-02"),
      flight("2022-04-02"),
    ];
    expect(byId(consecutive, "ten_years_running").current).toBe(3);

    // A missing year restarts the run: 2020, 2021, then a gap, then 2024.
    const gapped = [flight("2020-04-02"), flight("2021-04-02"), flight("2024-04-02")];
    expect(byId(gapped, "ten_years_running").current).toBe(2);
  });

  it("reports no progress for binary badges", () => {
    const badge = byId([flight("2020-01-10")], "first_flight");
    expect(badge.current).toBeUndefined();
    expect(badge.target).toBeUndefined();
  });

  it("treats a same-country flight as domestic", () => {
    const domestic = byId([flight("2020-01-10")], "border_crossed");
    expect(domestic.unlocked).toBe(false);

    const crossing = byId(
      [flight("2020-01-10", { arrival_country: "NZ" })],
      "border_crossed",
    );
    expect(crossing.unlocked).toBe(true);
  });

  it("survives an empty or missing history", () => {
    expect(evaluateBadges([], NOW).every((badge) => !badge.unlocked)).toBe(true);
    expect(evaluateBadges(null, NOW)).toHaveLength(BADGE_DEFS.length);
  });
});

describe("sortForShelf", () => {
  it("puts newest unlocks first, then the nearest locked badge", () => {
    const order = sortForShelf(
      evaluateBadges(
        [
          flight("2020-01-10", { arrival_country: "NZ", distance_km: 2_000 }),
          flight("2024-03-10", { distance_km: 39_000 }),
        ],
        NOW,
      ),
    ).map((badge) => badge.id);

    // Four unlocks: the 2024 pair (once_around, long_hauler) stamped later than
    // the 2020 pair (first_flight, border_crossed), so they lead.
    const unlocked = order.slice(0, 4);
    expect(unlocked.slice(0, 2).sort()).toEqual(["long_hauler", "once_around"]);
    expect(unlocked.slice(2).sort()).toEqual(["border_crossed", "first_flight"]);

    // Locked: closest first. 41,000 km is 20% of the way to five laps but only
    // 11% of the way to the Moon.
    const locked = order.slice(4);
    expect(locked.indexOf("five_laps")).toBeLessThan(
      locked.indexOf("to_the_moon"),
    );
  });
});

describe("pickStripBadges", () => {
  // A history that unlocks badges across several categories, so the strip has
  // real choices to make rather than a single candidate.
  const history = [
    flight("2020-01-10", { arrival_country: "NZ", distance_km: 2_000 }),
    flight("2021-02-10", { arrival_country: "JP", distance_km: 9_000 }),
    flight("2024-03-10", { arrival_country: "US", distance_km: 35_000 }),
  ];
  const shelf = () => sortForShelf(evaluateBadges(history, NOW));

  it("never shows the same category twice", () => {
    const picked = pickStripBadges(shelf(), 2);
    const categories = picked.map((badge) => badge.category);
    expect(new Set(categories).size).toBe(categories.length);
  });

  it("shows the requested unlocks plus one to aim at", () => {
    const picked = pickStripBadges(shelf(), 2);
    expect(picked.filter((b) => b.unlocked)).toHaveLength(2);
    expect(picked.filter((b) => !b.unlocked)).toHaveLength(1);
  });

  it("blocks only the categories actually shown, not every scanned one", () => {
    // With a limit of 1, three of the four categories stay free, so the badge
    // to aim at must still be found.
    const picked = pickStripBadges(shelf(), 1);
    expect(picked).toHaveLength(2);
    expect(picked[1].unlocked).toBe(false);
  });

  it("repeats a category rather than showing nothing to aim at", () => {
    // Only distance badges exist here, and one is already earned.
    const distanceOnly = sortForShelf(evaluateBadges(history, NOW)).filter(
      (badge) => badge.category === "distance",
    );
    const picked = pickStripBadges(distanceOnly, 2);
    expect(picked.some((badge) => !badge.unlocked)).toBe(true);
  });
});
