import { YEAR_FILTER } from "../constants/filters";
import { parseToDate } from "./dateUtils";
import type { enhancedFlight } from "../types/enhancedFlight";

export const getYearValuesFromFlights = (flights: enhancedFlight[]): number[] => {
  const years = new Set<number>();
  flights.forEach((flight) => {
    const dt = parseToDate(flight?.departure_date);
    if (!dt) return;
    years.add(dt.getFullYear());
  });
  return Array.from(years).sort((a, b) => b - a);
};

export const buildYearFilterSelectData = (
  flights: enhancedFlight[],
  t: (key: string) => string,
) => {
  const years = getYearValuesFromFlights(flights);
  return [
    { value: YEAR_FILTER.ALL, label: t("filter.all") },
    { value: YEAR_FILTER.UPCOMING, label: t("filter.upcoming") },
    { value: YEAR_FILTER.PAST, label: t("filter.past") },
    ...years.map((year) => ({
      value: String(year),
      label: String(year),
    })),
  ];
};
