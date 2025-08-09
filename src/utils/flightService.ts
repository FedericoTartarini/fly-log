import { supabaseClient } from "../supabaseClient.js";
import airportsInfoData from "../../python/airports_info.json";
import airlinesInfo from "../../python/airlines.json";
import type { airportInfo } from "../types/airportInfo";

// Ensure airportsInfoData is typed
const airportsInfo: airportInfo[] = airportsInfoData;

/**
 * Calculate the great-circle distance between two points on the Earth surface.
 * @param coord1 - [latitude, longitude] of the first point in decimal degrees
 * @param coord2 - [latitude, longitude] of the second point in decimal degrees
 * @returns Distance in kilometers, or null if coordinates are invalid
 */
const haversine = (
  coord1: [number, number] | null,
  coord2: [number, number] | null,
): number | null => {
  if (!coord1 || !coord2) return null;

  const R = 6371;
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
 * @param distanceKm - Distance in kilometers
 * @param avgSpeedKmh - Average speed in km/h (default: 900)
 * @returns Estimated flight time in hours, or null if distance is null
 */
const estimateFlightTime = (
  distanceKm: number | null,
  avgSpeedKmh = 900,
): number | null => {
  if (distanceKm === null) return null;
  return distanceKm / avgSpeedKmh;
};

/**
 * Get airport coordinates by IATA code
 * @param iataCode - IATA code of the airport
 * @returns [latitude, longitude] if found, else null
 */
const getAirportCoordinates = (iataCode: string): [number, number] | null => {
  const airport = airportsInfo.find((airport) => airport.iata === iataCode);
  return airport ? [airport.lat, airport.lon] : null;
};

/**
 * Get ISO country code by airport IATA code
 * @param iataCode - IATA code of the airport
 * @returns ISO country code if found, else null
 */
const getIsoCountry = (iataCode: string): string | null => {
  const airport = airportsInfo.find((airport) => airport.iata === iataCode);
  return airport ? airport.iso_country : null;
};

/**
 * Enrich flight data with additional information from airports and airlines data
 * @param flight - EnhancedFlight data from database
 * @returns Enriched flight data
 */
export const enrichFlightData = (flight: any): any => {
  const depCoords = getAirportCoordinates(flight.departure_airport_iata);
  const depCountry = getIsoCountry(flight.departure_airport_iata);
  const arrCoords = getAirportCoordinates(flight.arrival_airport_iata);
  const arrCountry = getIsoCountry(flight.arrival_airport_iata);

  const distance = haversine(depCoords, arrCoords);
  const flightTime = estimateFlightTime(distance);

  const airline = airlinesInfo.find((a: any) => a.iata === flight.airline_iata);

  let airlineName: string | null = null;
  let airlinePrimaryColor: string | null = null;
  let airlineIconPath: string | null = null;

  if (airline) {
    airlineName = airline.name;
    airlinePrimaryColor = airline.branding?.primary_color || null;

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
 * @returns Array of enriched flight objects
 */
export const getUserFlights = async (): Promise<any[]> => {
  const { data, error } = await supabaseClient
    .from("flights")
    .select("*")
    .order("departure_date", { ascending: false });

  if (error) {
    console.error("Error fetching flights:", error);
    throw error;
  }

  return (data || []).map((flight: any) => enrichFlightData(flight));
};

/**
 * Fetches flights filtered by year for the current user and enriches them with additional data
 * @param year - Year to filter by, or "all"
 * @returns Array of filtered enriched flight objects
 */
export const getFilteredUserFlights = async (
  year: number | string,
): Promise<any[]> => {
  let query = supabaseClient.from("flights").select("*");

  const today: string = new Date().toISOString().split("T")[0];
  if (year === "upcoming") {
    query = query.gt("departure_date", today);
  } else if (year === "all") {
    query = query.lte("departure_date", today);
  } else {
    const startDate = `${year}-01-01`;
    let endDate = `${year}-12-31`;

    const thisYear = today.split("-")[0];

    if (year === thisYear) {
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

  return (data || []).map((flight: any) => enrichFlightData(flight));
};
