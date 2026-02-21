import i18n from "i18next";
import { parseToDate } from "./dateUtils";
import { capitalize } from "./stringUtils";
import { getCountryName } from "./countryUtils";
import { getAirlineName } from "./airlineUtils";
import { getAirportCity } from "./airportUtils";
import { TIME_GROUPING } from "../constants/filters.ts";

export const getDeparturesByCountry = (flights) => {
  if (!flights) return [];
  const departuresByCountry = flights.reduce((acc, flight) => {
    const countryCode = flight.departure_country;
    if (countryCode) {
      const countryName = getCountryName(countryCode) || countryCode;
      acc[countryName] = (acc[countryName] || 0) + 1;
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

export const getFlightsByTimeGrouping = (flights, timeGrouping) => {
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

    grouping[key] = (grouping[key] || 0) + 1;
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

export const getFlightsByAirline = (flights) => {
  if (!flights) return [];
  const flightsByAirline = flights.reduce((acc, flight) => {
    const airlineCode = flight.airline_iata;
    if (airlineCode) {
      const airlineName = getAirlineName(airlineCode);
      const safeKey = airlineName || airlineCode;
      acc[safeKey] = (acc[safeKey] || 0) + 1;
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

export const getFlightsByAirport = (flights) => {
  if (!flights) return [];
  const flightsByAirport = flights.reduce((acc, flight) => {
    const airportCode = flight.departure_airport_iata;
    if (airportCode) {
      const airportCity = getAirportCity(airportCode) || airportCode;
      acc[airportCity] = (acc[airportCity] || 0) + 1;
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
