// src/constants/MyClasses.ts

/**
 * IDS used throughout the application for stats and filters.
 */
export const IDS = {
  STATS: {
    TOTAL_FLIGHTS: "total-flights",
    TOTAL_DISTANCE: "total-distance",
    TOTAL_TIME: "total-time",
    AIRPORTS_VISITED: "airports-visited",
    AIRLINES_FLOWN: "airlines-flown",
    COUNTRIES_VISITED: "countries-visited",
  },
  FILTERS: {
    YEAR_FILTER: "flight-year-filter",
  },
  // Add more sections as needed
} as const;

/**
 * Application route paths.
 */
export const PATHS = {
  HOME: "/",
  FLIGHTS: "/flights",
  STATS: "/stats",
  ADD_FLIGHT: "/add-flight",
  EDIT_FLIGHT: "/edit-flight/:id",
  ABOUT: "/about",
  LOGIN: "/login",
  // Add more paths as needed
} as const;

/**
 * Application name, brand, version, and author.
 */
export const APP_INFO = {
  APP_NAME: "FlyLog",
  BRAND: "FlyLog",
  VERSION: "0.0.1",
  AUTHOR: "Federico Tartarini",
  BUY_ME_A_COFFEE: "https://buymeacoffee.com/federicot",
  GITHUB_REPO: "https://github.com/FedericoTartarini/fly-log",
  PATREON: '"https://www.patreon.com/federicotartarini"',
} as const;
