// src/types.js

/**
 * @typedef {object} FlightStats
 * @property {number} [airlines]
 * @property {number} [airports]
 * @property {number} [countries]
 * @property {number} [domesticFlights]
 * @property {number} [internationalFlights]
 * @property {number} [longHaulFlights]
 * @property {object} [longestFlight]
 * @property {object} [shortestFlight]
 * @property {number} [totalDistance]
 * @property {number} [totalFlightTime]
 * @property {number} [westBoundFlights]
 */

/**
 * @typedef {object} AirportTableRow
 * @property {Date} departure_date
 * @property {Date} departure_time
 * @property {string} departure_airport_iata
 * @property {string} arrival_airport_iata
 * @property {string} airline_iata
 * @property {string} flight_number
 */

/**
 * @typedef {object} Airport
 * @property {string} iata
 * @property {string} icao
 * @property {string} airport_name
 * @property {string} country
 * @property {string} city
 * @property {number} lat
 * @property {number} lon
 * @property {number} elevation_ft
 * @property {string} iso_country
 * @property {string} iso_region
 */

/**
 * @typedef {object} Airline
 * @property {string} iata
 * @property {string} icao
 * @property {string} name
 * @property {string} country
 * @property {boolean} flag_carrier
 * @property {string} website
 * @property {string} alliance
 * @property {object} branding
 */

export {}; // This file is only for type definitions.
