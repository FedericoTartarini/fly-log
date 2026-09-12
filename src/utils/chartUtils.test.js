import { describe, it, expect, beforeEach } from "vitest";
import i18n from "i18next";
import {
  getFlightsByTimeGrouping,
  getFlightsByAirline,
  getFlightMonthMatrix,
  getMonthMatrixStats,
  formatMetricValue,
  formatCompactValue,
  labelFitsInsideBar,
} from "./chartUtils";
import { capitalize } from "./stringUtils";
import { CHART_METRIC, TIME_GROUPING } from "../constants/filters.ts";
import { estimateCo2Kg } from "./emissions";

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
    expect(getFlightMonthMatrix([])).toEqual({ years: [], counts: {} });
    expect(getFlightMonthMatrix(null)).toEqual({ years: [], counts: {} });
  });

  it("tallies flights per UTC year/month and sorts years ascending", () => {
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
  });
});

describe("getMonthMatrixStats", () => {
  it("returns zeroed stats for an empty matrix", () => {
    expect(getMonthMatrixStats({ years: [], counts: {} })).toEqual({
      total: 0,
      activeMonths: 0,
      busiestMonth: null,
      busiestValue: 0,
    });
  });

  it("computes totals, active months, and the busiest month", () => {
    const matrix = {
      years: [2024, 2025],
      counts: {
        2024: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        2025: [1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    };
    const stats = getMonthMatrixStats(matrix);
    expect(stats.total).toBe(5);
    expect(stats.activeMonths).toBe(3);
    expect(stats.busiestMonth).toEqual({ year: 2025, month: 2 });
    expect(stats.busiestValue).toBe(3);
  });

  it("keeps the earliest month when several tie for busiest", () => {
    const matrix = {
      years: [2024, 2025],
      counts: {
        2024: [0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0], // Jun 2024
        2025: [0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Feb 2025, same count
      },
    };
    const stats = getMonthMatrixStats(matrix);
    expect(stats.busiestMonth).toEqual({ year: 2024, month: 5 });
    expect(stats.busiestValue).toBe(5);
  });
});

describe("the distance metric", () => {
  // Two short Qantas hops against one long Emirates haul: Qantas wins on
  // flight count, Emirates wins on distance.
  // Shaped like an enriched flight: co2_kg is set once at fetch time, so the
  // chart code reads it rather than deriving it.
  const enriched = (overrides) => ({
    departure_date: "2025-03-10T08:00:00Z",
    airline_iata: "QF",
    international: false,
    distance_km: 700,
    ...overrides,
    co2_kg: estimateCo2Kg({
      distance_km: overrides.distance_km,
      international: overrides.international ?? false,
    }),
  });

  const flights = [
    enriched({ distance_km: 700 }),
    enriched({ departure_date: "2025-03-12T08:00:00Z", distance_km: 800 }),
    enriched({
      departure_date: "2025-04-01T08:00:00Z",
      airline_iata: "EK",
      international: true,
      distance_km: 12000,
    }),
  ];

  it("counts flights by default and sums kilometres when asked", () => {
    const byMonth = (metric) =>
      getFlightsByTimeGrouping(flights, TIME_GROUPING.MONTH, metric);

    expect(byMonth().map((d) => d.flights)).toEqual([2, 1]);
    expect(byMonth(CHART_METRIC.DISTANCE).map((d) => d.flights)).toEqual([
      1500, 12000,
    ]);
  });

  it("re-ranks the bars, because the sort key is the summed value", () => {
    expect(getFlightsByAirline(flights)[0].flights).toBe(2);
    expect(getFlightsByAirline(flights, CHART_METRIC.DISTANCE)[0].flights).toBe(
      12000,
    );
  });

  it("treats a missing distance as zero rather than NaN", () => {
    const matrix = getFlightMonthMatrix(
      [{ departure_date: "2025-03-10T08:00:00Z" }],
      CHART_METRIC.DISTANCE,
    );
    expect(matrix.counts[2025][2]).toBe(0);
    expect(getMonthMatrixStats(matrix).total).toBe(0);
  });

  it("treats a non-finite distance as zero rather than NaN", () => {
    const matrix = getFlightMonthMatrix(
      [
        { departure_date: "2025-03-10T08:00:00Z", distance_km: NaN },
        { departure_date: "2025-03-12T08:00:00Z", distance_km: Infinity },
      ],
      CHART_METRIC.DISTANCE,
    );
    expect(matrix.counts[2025][2]).toBe(0);
    expect(getMonthMatrixStats(matrix).total).toBe(0);
  });

  it("abbreviates bar labels to thousands, per locale", () => {
    expect(formatCompactValue(850, "en-AU")).toBe("850");
    expect(formatCompactValue(1500, "en-AU")).toBe("1.5K");
    expect(formatCompactValue(12000, "en-AU")).toBe("12K");
    expect(formatCompactValue(1500, "it")).toBe("1,5K");
  });

  it("keeps a bar label inside only when the bar is wide enough for it", () => {
    // A 200px bar swallows "12K"; a 20px one does not, so the label moves out.
    expect(labelFitsInsideBar(200, "12K")).toBe(true);
    expect(labelFitsInsideBar(20, "12K")).toBe(false);
  });

  it("sums the co2_kg set at enrichment time", () => {
    // 12000 km long haul dwarfs the two short domestic hops, so the CO2 bars
    // rank the same way the distance bars do.
    const byAirline = getFlightsByAirline(flights, CHART_METRIC.CO2);
    expect(byAirline[0].flights).toBeGreaterThan(byAirline[1].flights);
    // Emissions are a fraction of the kilometres, never equal to them.
    const km = getFlightsByAirline(flights, CHART_METRIC.DISTANCE)[0].flights;
    expect(byAirline[0].flights).toBeLessThan(km);
    expect(byAirline[0].flights).toBeGreaterThan(0);
  });

  it("contributes nothing for a flight with no co2_kg on it", () => {
    // A record that never went through enrichment must not become NaN.
    const bare = [
      { departure_date: "2025-03-10T08:00:00Z", airline_iata: "QF" },
    ];
    expect(getFlightsByAirline(bare, CHART_METRIC.CO2)[0].flights).toBe(0);
  });

  it("formats values with the locale separator, and a unit for distances", () => {
    expect(formatMetricValue(12000, CHART_METRIC.FLIGHTS, "en-AU")).toBe(
      "12,000",
    );
    expect(formatMetricValue(12000, CHART_METRIC.DISTANCE, "en-AU")).toBe(
      "12,000 km",
    );
    expect(formatMetricValue(12000, CHART_METRIC.DISTANCE, "it")).toBe(
      "12.000 km",
    );
    expect(formatMetricValue(1404, CHART_METRIC.CO2, "en-AU")).toBe(
      "1,404 kg CO₂e",
    );
  });
});
