/**
 * Tab name constants for FlightEntryForm.
 * Use these everywhere instead of raw string literals so that renames
 * are a single-file change and typos are caught at compile time.
 */
export const FLIGHT_ENTRY_TABS = {
  AI: "ai",
  MANUAL: "manual",
  CSV: "csv",
} as const;

export type FlightEntryTab =
  (typeof FLIGHT_ENTRY_TABS)[keyof typeof FLIGHT_ENTRY_TABS];
