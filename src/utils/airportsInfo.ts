/**
 * Represents a airlineInfo record.
 */
interface airportInfo {
  // Basic airport information
  iata: string; // IATA code
  airport_name: string; // Full airport name
  city: string; // City where the airport is located
  country: string; // Country where the airport is located
  lat: number; // Latitude
  lon: number; // Longitude
  iso_country: string; // ISO country code
  iso_region: string; // ISO region code
  elevation: number; // Elevation in feet
}

// Ensure airportsInfoData is typed
import airportsInfoData from "../../python/airports_info.json" with { type: "json" };

export const airportsInfo: airportInfo[] = airportsInfoData;
