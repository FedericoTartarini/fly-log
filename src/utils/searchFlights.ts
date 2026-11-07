import type { enhancedFlight } from "../types/enhancedFlight";
import { getAirportCity } from "./airportUtils";

// Lower case without accents, so "zurich" finds Zürich.
const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Keep the flights whose airport codes, cities, airline or flight number
 * contain the query. A flight number matches with or without the space
 * ("QF81", "QF 81"). An empty query keeps every flight.
 */
export const searchFlights = (
  flights: enhancedFlight[],
  query: string,
): enhancedFlight[] => {
  const q = fold(query.trim());
  if (!q) return flights;
  return flights.filter((flight) => {
    const airline = flight.airline_iata ?? "";
    const number = flight.flight_number ?? "";
    const text = [
      flight.departure_airport_iata,
      flight.arrival_airport_iata,
      getAirportCity(flight.departure_airport_iata),
      getAirportCity(flight.arrival_airport_iata),
      flight.airline_name,
      airline,
      number && `${airline}${number}`,
      number && `${airline} ${number}`,
    ]
      .filter(Boolean)
      .join(" | ");
    return fold(text).includes(q);
  });
};
