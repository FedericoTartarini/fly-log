import { airlinesInfo } from "./airlinesInfo";

const airlineNameByIata: Map<string, string> = new Map(
  airlinesInfo.map((a) => [a.iata, a.name]),
);
export const getAirlineName = (iata: string): string => {
  const airlineName = airlineNameByIata.get(iata);
  if (!airlineName) return iata;
  // Remove "airline" or "airlines" from the end, case-insensitive
  return airlineName
    .replace(/\s+airlines?$/i, "")
    .replace(/\s+airways?$/i, "")
    .replace(/\s+airs?$/i, "")
    .replace(/\s+air lines?$/i, "");
};
