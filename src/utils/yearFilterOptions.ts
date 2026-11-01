import { parseToDate } from "./dateUtils";
import type { enhancedFlight } from "../types/enhancedFlight";

export const getYearValuesFromFlights = (
  flights: enhancedFlight[],
): number[] => {
  const years = new Set<number>();
  flights.forEach((flight) => {
    const dt = parseToDate(flight?.departure_date);
    if (!dt) return;
    years.add(dt.getFullYear());
  });
  return Array.from(years).sort((a, b) => b - a);
};
