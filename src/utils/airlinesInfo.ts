/**
 * Represents a airportInfo record.
 */
interface airlineInfo {
  // Basic airline information
  iata: string; // IATA code
  name: string; // Full airline name
  icao: string; // ICAO code
  country: string; // Country where the airline is based
  flag_carrier?: boolean;
  website: string; // Airline website URL
  alliance?: string | null; // Airline alliance (if any)
  branding: {
    primary_color: string;
    guidelines?: string;
    variations: string[];
  };
}

// Ensure airportsInfoData is typed
import airlinesInfoData from "../../python/airlines.json" with { type: "json" };

export let airlinesInfo: airlineInfo[];
airlinesInfo = airlinesInfoData;
