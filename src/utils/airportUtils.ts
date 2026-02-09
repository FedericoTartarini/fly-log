import { airportsInfo } from "./airportsInfo";

const airportCityByIata: Map<string, string> = new Map(
  airportsInfo
    .filter((a) => a.iata && a.city)
    .map((a) => [a.iata, a.city.replace(/\s*\([^)]*\)/g, "")])
);

export const getAirportCity = (iata: string): string => {
  const city = airportCityByIata.get(iata);
  if (!city) return iata;
  return city.replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
};
