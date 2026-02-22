import { YEAR_FILTER } from "../constants/filters";
import type { enhancedFlight } from "../types/enhancedFlight";
import { getYear, parseToDate } from "./dateUtils";
import type { StoreFlightFilters } from "../store";

export type FacetKey = "airline" | "departureAirport" | "arrivalAirport";

const filterByYearSelection = (
  flights: enhancedFlight[],
  selectedYear: string,
): enhancedFlight[] => {
  if (!selectedYear || selectedYear === YEAR_FILTER.ALL) return flights;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedYear === YEAR_FILTER.UPCOMING) {
    return flights.filter((flight) => {
      const date = parseToDate(flight.departure_date);
      return date !== null && date >= today;
    });
  }

  if (selectedYear === YEAR_FILTER.PAST) {
    return flights.filter((flight) => {
      const date = parseToDate(flight.departure_date);
      return date !== null && date < today;
    });
  }

  return flights.filter((flight) => {
    const year = getYear(flight.departure_date);
    return year !== null && String(year) === selectedYear;
  });
};

const filterByDuration = (
  flights: enhancedFlight[],
  filters: StoreFlightFilters,
): enhancedFlight[] => {
  if (filters.minDuration === null && filters.maxDuration === null) {
    return flights;
  }

  return flights.filter((flight) => {
    if (typeof flight.flight_time !== "number") return false;
    if (filters.minDuration !== null && flight.flight_time < filters.minDuration) {
      return false;
    }
    if (filters.maxDuration !== null && flight.flight_time > filters.maxDuration) {
      return false;
    }
    return true;
  });
};

export const filterFlightsForFacetOptions = (
  flights: enhancedFlight[],
  selectedYear: string,
  filters: StoreFlightFilters,
  excludedFacet: FacetKey,
): enhancedFlight[] => {
  let filtered = filterByYearSelection(flights, selectedYear);
  filtered = filterByDuration(filtered, filters);

  if (excludedFacet !== "airline" && filters.airline) {
    filtered = filtered.filter(
      (flight) =>
        flight.airline_iata === filters.airline ||
        flight.airline_name === filters.airline,
    );
  }

  if (excludedFacet !== "departureAirport" && filters.departureAirport) {
    filtered = filtered.filter(
      (flight) => flight.departure_airport_iata === filters.departureAirport,
    );
  }

  if (excludedFacet !== "arrivalAirport" && filters.arrivalAirport) {
    filtered = filtered.filter(
      (flight) => flight.arrival_airport_iata === filters.arrivalAirport,
    );
  }

  return filtered;
};
