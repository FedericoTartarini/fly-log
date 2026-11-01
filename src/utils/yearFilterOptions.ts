import { getYear } from "./dateUtils";
import type { enhancedFlight } from "../types/enhancedFlight";

export const getYearValuesFromFlights = (
  flights: enhancedFlight[],
): number[] => {
  const years = new Set<number>();
  flights.forEach((flight) => {
    const year = getYear(flight?.departure_date);
    if (year !== null) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
};
