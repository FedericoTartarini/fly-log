// src/types.js

/**
 * @typedef {object} Flight
 * @property {string} date
 * @property {[number, number]} departure_coordinates
 * @property {[number, number]} arrival_coordinates
 * @property {number} [distance_km]
 * @property {number} [flight_time]
 * @property {string} [from]
 * @property {string} [to]
 * @property {string} [airline]
 * @property {string} [airline_icon_path]
 * @property {string} [airline_primary_color]
 * @property {string} [airline_name]
 * @property {string} [flight_number]
 * @property {string} [departure_country]
 * @property {string} [arrival_country]
 * @property {string} [aircraft_type_name]
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
