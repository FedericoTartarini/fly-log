import i18n from '../i18n';
import { parseToDate } from './dateUtils';
import { capitalize } from './stringUtils';

/**
 * Get localized weekday names in order
 */
function localizedWeekdays(locale) {
  const weekdays = [];
  // Create a date for each day of the week (starting Monday)
  const baseDate = new Date(2024, 0, 1); // Jan 1, 2024 is a Monday
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    const weekday = capitalize(
      new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
    );
    weekdays.push(weekday);
  }
  return weekdays;
}

/**
 * Get localized month names in order
 */
function localizedMonths(locale) {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    const month = capitalize(
      new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
    );
    months.push(month);
  }
  return months;
}

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

export const getFlightsByTimeGrouping = (flights, timeGrouping) => {
  const grouping = {};
  const locale = i18n.language || 'en-AU';

  flights.forEach((flight) => {
    if (!flight.departure_date) return;

    const date = parseToDate(flight.departure_date);
    if (!date) return;

    let key;

    switch (timeGrouping) {
      case 'dayOfWeek':
        key = capitalize(
          new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
        );
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
      case 'month':
        key = capitalize(
          new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
        );
        break;
      default:
        key = 'Unknown';
    }

    grouping[key] = (grouping[key] || 0) + 1;
  });

  // Define order for consistent display using localized names
  let order;
  switch (timeGrouping) {
    case 'dayOfWeek':
      order = localizedWeekdays(locale);
      break;
    case 'month':
      order = localizedMonths(locale);
      break;
    default:
      order = Object.keys(grouping).sort();
  }

  return order
    .filter((key) => grouping[key])
    .map((key) => ({
      period: key,
      flights: grouping[key] || 0,
    }));
};
