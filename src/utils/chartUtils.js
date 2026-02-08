import i18n from "i18next";
import { parseToDate } from "./dateUtils";
import { capitalize } from "./stringUtils";

export const getDeparturesByCountry = (flights) => {
  const departuresByCountry = flights.reduce((acc, flight) => {
    const country = flight.departure_country;
    if (country) {
      acc[country] = (acc[country] || 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(departuresByCountry)
    .map(([country, count]) => ({
      country,
      departures: count,
    }))
    .sort((a, b) => b.departures - a.departures);
};

// Helper: build localized weekday names starting from Monday
const localizedWeekdays = (locale) => {
  // pick a Monday (1970-01-05 is Monday) and iterate 7 days
  const base = new Date(Date.UTC(1970, 0, 5));
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return capitalize(fmt.format(d));
  });
};

// Helper: build localized month names January..December
const localizedMonths = (locale) => {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }).map((_, i) =>
    capitalize(fmt.format(new Date(Date.UTC(2020, i, 1)))),
  );
};

export const getFlightsByTimeGrouping = (flights, timeGrouping) => {
  const grouping = {};

  // Choose locale from i18n; fallback to en-AU
  const locale = (i18n && i18n.language) || "en-AU";

  flights.forEach((flight) => {
    const d = parseToDate(flight.departure_date);
    if (!d) return;

    let key;
    switch (timeGrouping) {
      case "dayOfWeek":
        key = capitalize(
          new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(d),
        );
        break;
      case "year":
        key = d.getFullYear().toString();
        break;
      case "month":
        key = capitalize(
          new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(d),
        );
        break;
      default:
        key = "Unknown";
    }

    grouping[key] = (grouping[key] || 0) + 1;
  });

  // Build ordered list matching locale
  let order;
  if (timeGrouping === "dayOfWeek") {
    order = localizedWeekdays(locale);
  } else if (timeGrouping === "month") {
    order = localizedMonths(locale);
  } else {
    order = Object.keys(grouping).sort();
  }

  return order
    .filter((k) => Object.prototype.hasOwnProperty.call(grouping, k))
    .map((key) => ({
      period: key,
      flights: grouping[key] || 0,
    }));
};
