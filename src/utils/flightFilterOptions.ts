import type { enhancedFlight } from "../types/enhancedFlight";
import type { AirportInfo } from "./referenceData";

export type SelectOption = { value: string; label: string };

type AirportKey = "departure_airport_iata" | "arrival_airport_iata";

// Build unique airline select options from current flights.
export const buildAirlineOptions = (
  flights: enhancedFlight[],
): SelectOption[] => {
  const byValue = new Map<string, string>();

  flights.forEach((flight) => {
    if (flight.airline_iata) {
      const label = flight.airline_name
        ? `${flight.airline_iata} - ${flight.airline_name}`
        : flight.airline_iata;
      byValue.set(flight.airline_iata, label);
      return;
    }

    if (flight.airline_name) {
      byValue.set(flight.airline_name, flight.airline_name);
    }
  });

  return Array.from(byValue.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// Build an airport label for filter dropdowns.
const buildAirportLabel = (airport: AirportInfo): string => {
  return `${airport.iata} - ${airport.airport_name}, ${airport.city}, ${airport.country}`;
};

// Build unique airport select options from current flights.
export const buildAirportOptions = (
  flights: enhancedFlight[],
  airportsData: AirportInfo[],
  key: AirportKey,
): SelectOption[] => {
  const usedIata = new Set<string>();
  flights.forEach((flight) => {
    const iata = flight[key];
    if (iata) usedIata.add(iata);
  });

  const airportsByIata = new Map<string, AirportInfo>();
  airportsData.forEach((airport) => {
    if (airport?.iata) airportsByIata.set(airport.iata, airport);
  });

  const options: SelectOption[] = [];
  usedIata.forEach((iata) => {
    const airport = airportsByIata.get(iata);
    options.push({
      value: iata,
      label: airport ? buildAirportLabel(airport) : iata,
    });
  });

  return options.sort((a, b) => a.label.localeCompare(b.label));
};
