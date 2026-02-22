export const YEAR_FILTER = {
  ALL: "all",
  UPCOMING: "upcoming",
  PAST: "past",
} as const;

export type YearFilterPreset = (typeof YEAR_FILTER)[keyof typeof YEAR_FILTER];

export const TIME_GROUPING = {
  DAY_OF_WEEK: "dayOfWeek",
  YEAR: "year",
  MONTH: "month",
} as const;

export type TimeGrouping = (typeof TIME_GROUPING)[keyof typeof TIME_GROUPING];

export const CHART_GROUPING = {
  COUNTRY: "country",
  AIRLINE: "airline",
  AIRPORT: "airport",
} as const;

export type ChartGrouping =
  (typeof CHART_GROUPING)[keyof typeof CHART_GROUPING];
