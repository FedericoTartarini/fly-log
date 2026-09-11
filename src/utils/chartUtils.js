import i18n from "i18next";
import { parseToDate } from "./dateUtils";
import { capitalize } from "./stringUtils";
import { getCountryName } from "./countryUtils";
import { getAirlineName } from "./airlineUtils";
import { getAirportCity } from "./airportUtils";
import { CHART_METRIC, TIME_GROUPING } from "../constants/filters.ts";
import { estimateCo2Kg } from "./emissions.ts";

// What one flight adds to its bucket: 1 for a flight count, its distance in
// whole kilometres, or its estimated emissions in whole kg CO2e. Unknown or
// non-finite distances contribute nothing rather than NaN.
const metricValue = (flight, metric) => {
  if (metric === CHART_METRIC.DISTANCE) {
    return Number.isFinite(flight.distance_km)
      ? Math.round(flight.distance_km)
      : 0;
  }
  if (metric === CHART_METRIC.CO2) return Math.round(estimateCo2Kg(flight));
  return 1;
};

export const getDeparturesByCountry = (flights, metric) => {
  if (!flights) return [];
  const departuresByCountry = flights.reduce((acc, flight) => {
    const countryCode = flight.departure_country;
    if (countryCode) {
      const countryName = getCountryName(countryCode) || countryCode;
      acc[countryName] = (acc[countryName] || 0) + metricValue(flight, metric);
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
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return capitalize(fmt.format(d));
  });
};

// Helper: build localized month names January..December
const localizedMonths = (locale) => {
  const fmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: 12 }).map((_, i) =>
    capitalize(fmt.format(new Date(Date.UTC(2020, i, 1)))),
  );
};

export const getFlightsByTimeGrouping = (flights, timeGrouping, metric) => {
  if (!flights) return [];
  const grouping = {};

  // Choose locale from i18n; fallback to en-AU
  const locale = (i18n && i18n.language) || "en-AU";

  flights.forEach((flight) => {
    const d = parseToDate(flight.departure_date);
    if (!d) return;

    let key;
    switch (timeGrouping) {
      case TIME_GROUPING.DAY_OF_WEEK:
        key = capitalize(
          new Intl.DateTimeFormat(locale, {
            weekday: "short",
            timeZone: "UTC",
          }).format(d),
        );
        break;
      case TIME_GROUPING.YEAR:
        key = d.getUTCFullYear().toString();
        break;
      case TIME_GROUPING.MONTH:
        key = capitalize(
          new Intl.DateTimeFormat(locale, {
            month: "short",
            timeZone: "UTC",
          }).format(d),
        );
        break;
      default:
        key = "Unknown";
    }

    grouping[key] = (grouping[key] || 0) + metricValue(flight, metric);
  });

  // Build ordered list matching locale
  let order;
  if (timeGrouping === TIME_GROUPING.DAY_OF_WEEK) {
    order = localizedWeekdays(locale);
  } else if (timeGrouping === TIME_GROUPING.MONTH) {
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

export const getFlightsByAirline = (flights, metric) => {
  if (!flights) return [];
  const flightsByAirline = flights.reduce((acc, flight) => {
    const airlineCode = flight.airline_iata;
    if (airlineCode) {
      const airlineName = getAirlineName(airlineCode);
      const safeKey = airlineName || airlineCode;
      acc[safeKey] = (acc[safeKey] || 0) + metricValue(flight, metric);
    }
    return acc;
  }, {});

  return Object.entries(flightsByAirline)
    .map(([airline, count]) => ({
      airline,
      flights: count,
    }))
    .sort((a, b) => b.flights - a.flights);
};

// Build a year x month matrix for the Timeline heatmap, totalling either
// flights or kilometres per month. Returns the sorted list of years (oldest
// first) and a `counts` map of year -> number[12] (Jan..Dec, UTC).
export const getFlightMonthMatrix = (flights, metric) => {
  if (!flights) return { years: [], counts: {} };
  const counts = {};
  flights.forEach((flight) => {
    const d = parseToDate(flight.departure_date);
    if (!d) return;
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    if (!counts[year]) counts[year] = new Array(12).fill(0);
    counts[year][month] += metricValue(flight, metric);
  });
  const years = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);
  return { years, counts };
};

// Summary stats derived from a year x month matrix (see getFlightMonthMatrix).
// `total` and `busiestValue` are in whatever unit the matrix was built with.
export const getMonthMatrixStats = (matrix) => {
  const { years = [], counts = {} } = matrix || {};
  let total = 0;
  let activeMonths = 0;
  let busiestMonth = null; // { year, month } 0-based month
  let busiestValue = 0;
  years.forEach((year) => {
    counts[year].forEach((value, month) => {
      if (value <= 0) return;
      total += value;
      activeMonths += 1;
      // Strictly greater, so a tie keeps the earliest month: a record belongs
      // to when it was first set and doesn't move as later months match it.
      if (value > busiestValue) {
        busiestValue = value;
        busiestMonth = { year, month };
      }
    });
  });
  return { total, activeMonths, busiestMonth, busiestValue };
};

// Abbreviate a bar value: 12000 -> "12K", 1500 -> "1.5K" ("1,5K" in Italian).
// Bars are short, and the unit lives in the card title rather than on each bar.
export const formatCompactValue = (value, locale) =>
  new Intl.NumberFormat(locale || (i18n && i18n.language) || "en-AU", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

// Rough width of one character at fontSize 12, used only to decide whether a
// bar's value label fits inside it. Being a few pixels out is harmless: the
// label moves outside the bar instead, which is still readable.
const CHAR_WIDTH = 7;

export const labelFitsInsideBar = (barWidth, text) =>
  barWidth > text.length * CHAR_WIDTH + 12;

// Unit shown after a formatted value. Flight counts have none.
const METRIC_UNITS = {
  [CHART_METRIC.DISTANCE]: "km",
  [CHART_METRIC.CO2]: "kg CO₂e",
};

// Format a chart value for display. Distances and emissions carry their unit;
// flight counts are a bare localized integer.
export const formatMetricValue = (value, metric, locale) => {
  const formatted = new Intl.NumberFormat(
    locale || (i18n && i18n.language) || "en-AU",
  ).format(value);
  const unit = METRIC_UNITS[metric];
  return unit ? `${formatted} ${unit}` : formatted;
};

// Localized month labels (Jan..Dec). Callers pass the active language so the
// labels can be recomputed when it changes; falls back to the i18n current one.
export const getLocalizedMonthLabels = (locale) =>
  localizedMonths(locale || (i18n && i18n.language) || "en-AU");

export const getFlightsByAirport = (flights, metric) => {
  if (!flights) return [];
  const flightsByAirport = flights.reduce((acc, flight) => {
    const airportCode = flight.departure_airport_iata;
    if (airportCode) {
      const airportCity = getAirportCity(airportCode) || airportCode;
      acc[airportCity] = (acc[airportCity] || 0) + metricValue(flight, metric);
    }
    return acc;
  }, {});

  return Object.entries(flightsByAirport)
    .map(([airport, count]) => ({
      airport,
      flights: count,
    }))
    .sort((a, b) => b.flights - a.flights);
};
