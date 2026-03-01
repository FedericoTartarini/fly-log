import { getReferenceMapsSync } from "./referenceData";

// Lookup the city for an airport IATA code, with a safe fallback.
export const getAirportCity = (iata: string): string => {
  const { airportByIata } = getReferenceMapsSync();
  const airport = airportByIata.get(String(iata || "").toUpperCase());
  const city = airport?.city;
  if (!city) return iata;
  return city
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
};
