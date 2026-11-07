import type { enhancedFlight } from "../types/enhancedFlight";
import { getAirportCity } from "./airportUtils";

// Lower case without accents, so "zurich" finds Zürich.
const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Keep the flights that contain every word of the query in their airport
 * codes, cities, airline or flight number, so "syd sin" finds Sydney to
 * Singapore in either direction. A flight number matches with or without
 * the space ("QF81", "QF 81"). An empty query keeps every flight.
 */
export const searchFlights = (
  flights: enhancedFlight[],
  query: string,
): enhancedFlight[] => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return flights;
  return flights.filter((flight) => {
    const airline = flight.airline_iata ?? "";
    const number = flight.flight_number ?? "";
    // " | " keeps a word from matching across two fields.
    const text = fold(
      [
        flight.departure_airport_iata,
        flight.arrival_airport_iata,
        getAirportCity(flight.departure_airport_iata),
        getAirportCity(flight.arrival_airport_iata),
        flight.airline_name,
        airline,
        number && `${airline}${number}`,
      ]
        .filter(Boolean)
        .join(" | "),
    );
    return words.every((word) => text.includes(word));
  });
};
