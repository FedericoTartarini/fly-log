import { YEAR_FILTER } from "../constants/filters";
import type { enhancedFlight } from "../types/enhancedFlight";
import { parseToDate } from "./dateUtils";
import type { StoreFlightFilters } from "../store";

export type FacetKey = "airline" | "departureAirport" | "arrivalAirport";

// Keep flights that match When (all, past or upcoming) and the year range.
export const filterByDate = (
  flights: enhancedFlight[],
  { when, fromYear, toYear }: StoreFlightFilters,
): enhancedFlight[] => {
  if (when === YEAR_FILTER.ALL && fromYear === null && toYear === null) {
    return flights;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return flights.filter((flight) => {
    const date = parseToDate(flight.departure_date);
    if (!date) return false;
    if (when === YEAR_FILTER.UPCOMING && date < today) return false;
    if (when === YEAR_FILTER.PAST && date >= today) return false;
    const year = date.getFullYear();
    if (fromYear !== null && year < fromYear) return false;
    return toYear === null || year <= toYear;
  });
};

// Filter flights by min/max duration constraints.
const filterByDuration = (
  flights: enhancedFlight[],
  filters: StoreFlightFilters,
): enhancedFlight[] => {
  if (filters.minDuration === null && filters.maxDuration === null) {
    return flights;
  }

  return flights.filter((flight) => {
    if (typeof flight.flight_time !== "number") return false;
    if (
      filters.minDuration !== null &&
      flight.flight_time < filters.minDuration
    ) {
      return false;
    }
    if (
      filters.maxDuration !== null &&
      flight.flight_time > filters.maxDuration
    ) {
      return false;
    }
    return true;
  });
};

// Apply every filter except `excludedFacet`, so a facet's options list what
// the other filters still allow. With no facet excluded, this is the filter.
export const filterFlightsForFacetOptions = (
  flights: enhancedFlight[],
  filters: StoreFlightFilters,
  excludedFacet?: FacetKey,
): enhancedFlight[] => {
  let filtered = filterByDate(flights, filters);
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
