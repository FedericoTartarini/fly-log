import { parseHourMinute, parseToDate, toCalendarDay } from "./dateUtils";
import { getAirportCity } from "./airportUtils";

// Guard against malformed coordinates.
const isValidCoords = (coord) =>
  Array.isArray(coord) &&
  coord.length === 2 &&
  coord.every((n) => typeof n === "number" && Number.isFinite(n));

// Today's calendar day where the user is, as "YYYY-MM-DD".
const localDay = (now) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

// Sort key: the calendar day, then the departure time on that day.
const sortKey = (flight) => {
  const time = parseHourMinute(flight.departure_time);
  const minutes = time ? time.hours * 60 + time.minutes : 0;
  return `${toCalendarDay(flight.departure_date)} ${String(minutes).padStart(4, "0")}`;
};

/**
 * The flights the tour plays, oldest first: those with a date and both
 * airports' coordinates. Flights on the same day play in departure-time
 * order. A flight from today on is upcoming. `now` is injectable for tests.
 */
export const buildTourRoutes = (flights, now = new Date()) => {
  const today = localDay(now);
  return (flights ?? [])
    .filter(
      (flight) =>
        parseToDate(flight.departure_date) &&
        isValidCoords(flight.departure_coordinates) &&
        isValidCoords(flight.arrival_coordinates),
    )
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    .map((flight) => ({
      id: String(flight.id),
      from: flight.departure_coordinates,
      to: flight.arrival_coordinates,
      fromCode: flight.departure_airport_iata,
      toCode: flight.arrival_airport_iata,
      fromCity:
        getAirportCity(flight.departure_airport_iata) ??
        flight.departure_airport_iata,
      toCity:
        getAirportCity(flight.arrival_airport_iata) ??
        flight.arrival_airport_iata,
      date: flight.departure_date,
      flightNumber: flight.flight_number
        ? `${flight.airline_iata ?? ""}${flight.flight_number}`
        : null,
      km: Number.isFinite(flight.distance_km) ? flight.distance_km : null,
      upcoming: toCalendarDay(flight.departure_date) >= today,
    }));
};
