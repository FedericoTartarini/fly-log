import { airportsInfo } from "./airportsInfo";

export const getAirportCity = (iata: string): string => {
  const airport = airportsInfo.find((a) => a.iata === iata);
  if (!airport) return iata;
  // Remove text within parentheses
  return airport.city.replace(/\s*\([^)]*\)/g, "");
};
