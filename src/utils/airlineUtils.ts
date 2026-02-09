import { airlinesInfo } from "./airlinesInfo";

export const getAirlineName = (iata: string): string => {
  const airline = airlinesInfo.find((a) => a.iata === iata);
  if (!airline) return iata;
  // Remove "airline" or "airlines" from the end, case-insensitive
  return airline.name
    .replace(/\s+airlines?$/i, "")
    .replace(/\s+airways?$/i, "")
    .replace(/\s+air?$/i, "")
    .replace(/\s+air lines?$/i, "");
};
