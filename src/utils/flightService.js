import { supabaseClient } from "../supabaseClient.js";
import airportsInfo from "../../python/airports_info.json";
import airlinesInfo from "../../python/airlines.json";

/**
 * Calculate the great-circle distance between two points on the Earth surface.
 *
 * @param {Array<number>} coord1 - [latitude, longitude] of the first point in decimal degrees
 * @param {Array<number>} coord2 - [latitude, longitude] of the second point in decimal degrees
 * @returns {number|null} Distance in kilometers, or null if coordinates are invalid
 */
const haversine = (coord1, coord2) => {
  if (!coord1 || !coord2) {
    return null;
  }

  const R = 6371; // Earth radius in kilometers
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Estimate flight time based on distance and average speed.
 *
 * @param {number|null} distanceKm - Distance in kilometers
 * @param {number} avgSpeedKmh - Average speed in km/h (default: 900)
 * @returns {number|null} Estimated flight time in hours, or null if distance is null
 */
const estimateFlightTime = (distanceKm, avgSpeedKmh = 900) => {
  if (distanceKm === null) {
    return null;
  }
  return distanceKm / avgSpeedKmh;
};

/**
 * Get airport coordinates by IATA code
 *
 * @param {string} iataCode - IATA code of the airport
 * @returns {Array<number>|null} [latitude, longitude] if found, else null
 */
const getAirportCoordinates = (iataCode) => {
  const airport = airportsInfo.find((airport) => airport.iata === iataCode);
  return airport ? [airport.lat, airport.lon] : null;
};

/**
 * Get ISO country code by airport IATA code
 *
 * @param {string} iataCode - IATA code of the airport
 * @returns {string|null} ISO country code if found, else null
 */
const getIsoCountry = (iataCode) => {
  const airport = airportsInfo.find((airport) => airport.iata === iataCode);
  return airport ? airport.iso_country : null;
};

/**
 * Enrich flight data with additional information from airports and airlines data
 *
 * @param {Object} flight - Flight data from database
 * @returns {Object} Enriched flight data
 */
export const enrichFlightData = (flight) => {
  // Get coordinates and country info
  const depCoords = getAirportCoordinates(flight.departure_airport_iata);
  const depCountry = getIsoCountry(flight.departure_airport_iata);
  const arrCoords = getAirportCoordinates(flight.arrival_airport_iata);
  const arrCountry = getIsoCountry(flight.arrival_airport_iata);

  // Calculate distance and flight time
  const distance = haversine(depCoords, arrCoords);
  const flightTime = estimateFlightTime(distance);

  // Get airline info
  const airline = airlinesInfo.find((a) => a.iata === flight.airline_iata);

  let airlineName = null;
  let airlinePrimaryColor = null;
  let airlineIconPath = null;

  if (airline) {
    airlineName = airline.name;
    airlinePrimaryColor = airline.branding?.primary_color || null;

    // Compose icon path similar to Python code
    if (airline.branding?.variations) {
      const iconName = airlineName.replace(/ /g, "-").toLowerCase();
      if (airline.branding.variations.includes("logo")) {
        airlineIconPath = `${iconName}.svg`;
      } else if (airline.branding.variations.includes("logo_mono")) {
        airlineIconPath = `${iconName}_mono.svg`;
      }
    }
  }

  return {
    ...flight,
    departure_coordinates: depCoords,
    arrival_coordinates: arrCoords,
    distance_km: distance,
    flight_time: flightTime,
    departure_country: depCountry,
    arrival_country: arrCountry,
    international: depCountry !== arrCountry,
    airline_name: airlineName,
    airline_primary_color: airlinePrimaryColor,
    airline_icon_path: airlineIconPath,
  };
};

/**
 * Fetches all flights for the current user and enriches them with additional data
 * @returns {Promise<Array>} Array of enriched flight objects
 */
export const getUserFlights = async () => {
  const { data, error } = await supabaseClient
    .from("flights")
    .select("*")
    .order("departure_date", { ascending: false });

  if (error) {
    console.error("Error fetching flights:", error);
    throw error;
  }

  // Enrich each flight with additional data
  const enrichedFlights = (data || []).map((flight) =>
    enrichFlightData(flight),
  );

  return enrichedFlights;
};

/**
 * Fetches flights filtered by year for the current user and enriches them with additional data
 * @param {number|string} year - Year to filter by, or "all"
 * @returns {Promise<Array>} Array of filtered enriched flight objects
 */
export const getFilteredUserFlights = async (year) => {
  let query = supabaseClient.from("flights").select("*");

  const today = new Date().toISOString().split("T")[0];
  console.log(today);
  if (year === "upcoming") {
    // Filter for upcoming flights
    // Get today's date in YYYY-MM-DD format
    query = query.gt("departure_date", today);
  } else if (year === "all") {
    query = query.lte("departure_date", today);
  } else {
    // Ensure year is a number
    const startDate = `${year}-01-01`;
    let endDate = `${year}-12-31`;

    const thisYear = today.split("-")[0];

    if (year === thisYear) {
      // If the year is the current year, filter for flights before today
      endDate = today;
    }

    query = query
      .gte("departure_date", startDate)
      .lte("departure_date", endDate);
  }

  const { data, error } = await query.order("departure_date", {
    ascending: false,
  });

  if (error) {
    console.error("Error fetching filtered flights:", error);
    throw error;
  }

  // Enrich each flight with additional data
  const enrichedFlights = (data || []).map((flight) =>
    enrichFlightData(flight),
  );

  return enrichedFlights;
};
