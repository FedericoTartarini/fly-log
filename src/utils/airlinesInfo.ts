/**
 * Represents an airline record.
 */
interface AirlineInfo {
  // Basic airline information
  iata: string; // IATA code
  name: string; // Full airline name
  icao: string | null; // ICAO code
}

// Ensure airlinesInfoData is typed
import airlinesInfoData from "../assets/airlines.json" with { type: "json" };

export let airlinesInfo: AirlineInfo[];
airlinesInfo = airlinesInfoData;
