export type AirportInfo = {
  iata: string;
  airport_name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  iso_country: string;
  iso_region: string;
  elevation: number;
};

export type AirlineInfo = {
  iata: string;
  name: string;
  icao: string;
};

export type ReferenceMaps = {
  airportByIata: Map<string, AirportInfo>;
  airlineByIata: Map<string, AirlineInfo>;
};

let airportsCache: AirportInfo[] = [];
let airlinesCache: AirlineInfo[] = [];
let referenceMapsCache: ReferenceMaps = {
  airportByIata: new Map(),
  airlineByIata: new Map(),
};

let airportsPromise: Promise<AirportInfo[]> | null = null;
let airlinesPromise: Promise<AirlineInfo[]> | null = null;
let mapsPromise: Promise<ReferenceMaps> | null = null;
let airportsLoaded = false;
let airlinesLoaded = false;

const maybeUpdateReferenceMaps = () => {
  if (!airportsLoaded || !airlinesLoaded) {
    return;
  }

  referenceMapsCache = buildMaps(airportsCache, airlinesCache);
};

const loadJson = async <T>(path: string): Promise<T[]> => {
  try {
    const response = await fetch(path, { cache: "force-cache" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
};

const buildMaps = (
  airports: AirportInfo[],
  airlines: AirlineInfo[],
): ReferenceMaps => {
  const airportByIata = new Map<string, AirportInfo>();
  airports.forEach((airport) => {
    if (airport?.iata) {
      airportByIata.set(String(airport.iata).toUpperCase(), airport);
    }
  });

  const airlineByIata = new Map<string, AirlineInfo>();
  airlines.forEach((airline) => {
    if (airline?.iata) {
      airlineByIata.set(String(airline.iata).toUpperCase(), airline);
    }
  });

  return { airportByIata, airlineByIata };
};

export const loadAirportsInfo = async (): Promise<AirportInfo[]> => {
  if (!airportsPromise) {
    airportsPromise = loadJson<AirportInfo>("/data/airports.json").then(
      (airports) => {
        airportsCache = airports;
        airportsLoaded = true;
        maybeUpdateReferenceMaps();
        return airportsCache;
      },
    );
  }
  return airportsPromise;
};

export const loadAirlinesInfo = async (): Promise<AirlineInfo[]> => {
  if (!airlinesPromise) {
    airlinesPromise = loadJson<AirlineInfo>("/data/airlines.json").then(
      (airlines) => {
        airlinesCache = airlines;
        airlinesLoaded = true;
        maybeUpdateReferenceMaps();
        return airlinesCache;
      },
    );
  }
  return airlinesPromise;
};

export const loadReferenceMaps = async (): Promise<ReferenceMaps> => {
  if (!mapsPromise) {
    mapsPromise = Promise.all([loadAirportsInfo(), loadAirlinesInfo()]).then(
      ([airports, airlines]) => {
        airportsCache = airports;
        airlinesCache = airlines;
        airportsLoaded = true;
        airlinesLoaded = true;
        maybeUpdateReferenceMaps();
        return referenceMapsCache;
      },
    );
  }
  return mapsPromise;
};

export const getReferenceMapsSync = (): ReferenceMaps => referenceMapsCache;
