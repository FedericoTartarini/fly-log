import { describe, it, expect, beforeEach } from "vitest";
import i18n from "i18next";
import {
  getFlightsByTimeGrouping,
  getFlightsByAirline,
  getFlightMonthMatrix,
  getMonthMatrixStats,
} from "./chartUtils";
import { capitalize } from "./stringUtils";
import { TIME_GROUPING } from "../constants/filters.ts";

// Helper to get localized weekday/month label as used in chartUtils
function weekdayLabel(date, locale) {
  return capitalize(
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      timeZone: "UTC",
    }).format(date),
  );
}
function monthLabel(date, locale) {
  return capitalize(
    new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(
      date,
    ),
  );
}

describe("getFlightsByTimeGrouping", () => {
  beforeEach(() => {
    // reset language before each test (set property directly to avoid i18next init)
    i18n.language = "en-US";
  });

  it("returns empty array for empty input", () => {
    const out = getFlightsByTimeGrouping([], TIME_GROUPING.DAY_OF_WEEK);
    expect(out).toEqual([]);
  });

  it("groups by dayOfWeek with mixed date types (en-US)", () => {
    i18n.language = "en-US";
    const dMon = new Date("2025-11-03T10:00:00Z"); // Monday
    const dTue = new Date("2025-11-04T10:00:00Z"); // Tuesday
    const dWed = new Date("2025-11-05T10:00:00Z"); // Wednesday

    const flights = [
      { departure_date: dMon },
      { departure_date: dMon.toISOString() },
      { departure_date: { seconds: Math.floor(dTue.getTime() / 1000) } },
      { departure_date: dWed.toISOString() },
    ];

    const out = getFlightsByTimeGrouping(flights, TIME_GROUPING.DAY_OF_WEEK);

    // Expect entries for Monday (2), Tuesday (1), Wednesday (1)
    const monLabel = weekdayLabel(dMon, i18n.language);
    const tueLabel = weekdayLabel(dTue, i18n.language);
    const wedLabel = weekdayLabel(dWed, i18n.language);

    const map = Object.fromEntries(out.map((r) => [r.period, r.flights]));
    expect(map[monLabel]).toBe(2);
    expect(map[tueLabel]).toBe(1);
    expect(map[wedLabel]).toBe(1);
  });

  it("groups by dayOfWeek with Italian locale", () => {
    i18n.language = "it-IT";
    const dMon = new Date("2025-11-03T10:00:00Z"); // Monday
    const dTue = new Date("2025-11-04T10:00:00Z"); // Tuesday

    const flights = [
      { departure_date: dMon.toISOString() },
      { departure_date: { seconds: Math.floor(dTue.getTime() / 1000) } },
    ];

    const out = getFlightsByTimeGrouping(flights, TIME_GROUPING.DAY_OF_WEEK);

    const monLabel = weekdayLabel(dMon, i18n.language);
    const tueLabel = weekdayLabel(dTue, i18n.language);

    const map = Object.fromEntries(out.map((r) => [r.period, r.flights]));
    expect(map[monLabel]).toBe(1);
    expect(map[tueLabel]).toBe(1);
  });

  it("groups by month with mixed types and locale handling", () => {
    i18n.language = "en-US";
    const jan = new Date("2025-01-15T12:00:00Z");
    const feb = new Date("2025-02-02T12:00:00Z");

    const flights = [
      { departure_date: jan },
      { departure_date: jan.toISOString() },
      { departure_date: { seconds: Math.floor(feb.getTime() / 1000) } },
    ];

    const out = getFlightsByTimeGrouping(flights, TIME_GROUPING.MONTH);

    const janLabel = monthLabel(jan, i18n.language);
    const febLabel = monthLabel(feb, i18n.language);

    const map = Object.fromEntries(out.map((r) => [r.period, r.flights]));
    expect(map[janLabel]).toBe(2);
    expect(map[febLabel]).toBe(1);
  });
});

describe("getFlightsByAirline", () => {
  it("returns empty array for empty input", () => {
    const out = getFlightsByAirline([]);
    expect(out).toEqual([]);
  });

  it("groups flights by airline and sorts by count descending", () => {
    const flights = [
      { airline_iata: "AA" },
      { airline_iata: "DL" },
      { airline_iata: "AA" },
      { airline_iata: "UA" },
      { airline_iata: "AA" },
    ];

    const out = getFlightsByAirline(flights);

    // Should have 3 entries: American (3), Delta Air Lines (1), United (1)
    expect(out).toHaveLength(3);
    expect(out[0].airline).toBe("American");
    expect(out[0].flights).toBe(3);
    expect(out[1].airline).toBe("Delta");
    expect(out[1].flights).toBe(1);
    expect(out[2].airline).toBe("United");
    expect(out[2].flights).toBe(1);
  });

  it("handles unknown airline codes by falling back to the code", () => {
    const flights = [{ airline_iata: "UNKNOWN" }, { airline_iata: "AA" }];

    const out = getFlightsByAirline(flights);

    // Should have 2 entries, with UNKNOWN as key since getAirlineName("UNKNOWN") likely returns empty
    expect(out).toHaveLength(2);
    const unknownEntry = out.find((item) => item.airline === "UNKNOWN");
    expect(unknownEntry).toBeDefined();
    expect(unknownEntry.flights).toBe(1);
  });

  it("ignores flights without airline_iata", () => {
    const flights = [{ airline_iata: "AA" }, {}, { airline_iata: null }];

    const out = getFlightsByAirline(flights);

    expect(out).toHaveLength(1);
    expect(out[0].airline).toBe("American");
    expect(out[0].flights).toBe(1);
  });
});

describe("getFlightMonthMatrix", () => {
  it("returns an empty matrix for empty/nullish input", () => {
    expect(getFlightMonthMatrix([])).toEqual({ years: [], counts: {}, max: 0 });
    expect(getFlightMonthMatrix(null)).toEqual({
      years: [],
      counts: {},
      max: 0,
    });
  });

  it("tallies flights per UTC year/month, sorts years ascending, tracks max", () => {
    const flights = [
      { departure_date: "2025-03-10T08:00:00Z" }, // Mar 2025
      { departure_date: "2025-03-20T20:00:00Z" }, // Mar 2025
      { departure_date: { seconds: Math.floor(Date.UTC(2024, 6, 1) / 1000) } }, // Jul 2024
      { departure_date: "2025-01-02T00:00:00Z" }, // Jan 2025
      { departure_date: "not-a-date" },
      {},
    ];

    const matrix = getFlightMonthMatrix(flights);
    expect(matrix.years).toEqual([2024, 2025]);
    expect(matrix.counts[2024][6]).toBe(1); // July
    expect(matrix.counts[2025][2]).toBe(2); // March
    expect(matrix.counts[2025][0]).toBe(1); // January
    expect(matrix.max).toBe(2);
  });
});

describe("getMonthMatrixStats", () => {
  it("returns zeroed stats for an empty matrix", () => {
    expect(getMonthMatrixStats({ years: [], counts: {}, max: 0 })).toEqual({
      totalFlights: 0,
      activeMonths: 0,
      busiestMonth: null,
      busiestCount: 0,
    });
  });

  it("computes totals, active months, and the busiest month", () => {
    const matrix = {
      years: [2024, 2025],
      counts: {
        2024: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        2025: [1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      max: 3,
    };
    const stats = getMonthMatrixStats(matrix);
    expect(stats.totalFlights).toBe(5);
    expect(stats.activeMonths).toBe(3);
    expect(stats.busiestMonth).toEqual({ year: 2025, month: 2 });
    expect(stats.busiestCount).toBe(3);
  });
});
