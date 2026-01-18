/**
 * Represents a airportInfo record.
 */
interface airlineInfo {
  // Basic airline information
  iata: string; // IATA code
  name: string; // Full airline name
  icao: string; // ICAO code
}

// Ensure airportsInfoData is typed
import airlinesInfoData from "../assets/airlines_info.json" with { type: "json" };

export let airlinesInfo: airlineInfo[];
airlinesInfo = airlinesInfoData;
