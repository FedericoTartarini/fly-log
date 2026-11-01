import { YEAR_FILTER } from "../constants/filters";
import type { StoreFlightFilters } from "../store";

export type ActiveFilter =
  | "when"
  | "years"
  | "airline"
  | "departureAirport"
  | "arrivalAirport"
  | "duration";

// What each filter tag's × resets. A filter is on while any of its fields
// differs from these values.
export const FILTER_RESETS: Record<
  ActiveFilter,
  Partial<StoreFlightFilters>
> = {
  when: { when: YEAR_FILTER.ALL },
  years: { fromYear: null, toYear: null },
  airline: { airline: null },
  departureAirport: { departureAirport: null },
  arrivalAirport: { arrivalAirport: null },
  duration: { minDuration: null, maxDuration: null },
};

export const DEFAULT_FILTERS = Object.assign(
  {},
  ...Object.values(FILTER_RESETS),
) as StoreFlightFilters;

// The filters that are on, in the order their tags show.
export const getActiveFilters = (filters: StoreFlightFilters): ActiveFilter[] =>
  (Object.keys(FILTER_RESETS) as ActiveFilter[]).filter((key) =>
    Object.entries(FILTER_RESETS[key]).some(
      ([field, value]) => filters[field as keyof StoreFlightFilters] !== value,
    ),
  );
