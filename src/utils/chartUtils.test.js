import { describe, it, expect, beforeEach } from "vitest";
import i18n from "i18next";
import { getFlightsByTimeGrouping, getFlightsByAirline } from "./chartUtils";
import { capitalize } from "./stringUtils";

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
    const out = getFlightsByTimeGrouping([], "dayOfWeek");
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

    const out = getFlightsByTimeGrouping(flights, "dayOfWeek");

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

    const out = getFlightsByTimeGrouping(flights, "dayOfWeek");

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

    const out = getFlightsByTimeGrouping(flights, "month");

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
