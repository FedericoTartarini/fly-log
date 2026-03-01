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

// Load airport reference data once and cache it in memory.
export const loadAirportsInfo = async (): Promise<AirportInfo[]> => {
  if (!airportsPromise) {
    airportsPromise = loadJson<AirportInfo>("/data/airports.json")
      .then((airports) => {
        if (!Array.isArray(airports) || airports.length === 0) {
          airportsLoaded = false;
          airportsPromise = null;
          throw new Error("Invalid airports data");
        }
        airportsCache = airports;
        airportsLoaded = true;
        maybeUpdateReferenceMaps();
        return airportsCache;
      })
      .catch((error) => {
        airportsLoaded = false;
        airportsPromise = null;
        throw error;
      });
  }
  return airportsPromise;
};

// Load airline reference data once and cache it in memory.
export const loadAirlinesInfo = async (): Promise<AirlineInfo[]> => {
  if (!airlinesPromise) {
    airlinesPromise = loadJson<AirlineInfo>("/data/airlines.json")
      .then((airlines) => {
        if (!Array.isArray(airlines) || airlines.length === 0) {
          airlinesLoaded = false;
          airlinesPromise = null;
          throw new Error("Invalid airlines data");
        }
        airlinesCache = airlines;
        airlinesLoaded = true;
        maybeUpdateReferenceMaps();
        return airlinesCache;
      })
      .catch((error) => {
        airlinesLoaded = false;
        airlinesPromise = null;
        throw error;
      });
  }
  return airlinesPromise;
};

// Load both datasets and build IATA lookup maps for sync usage.
export const loadReferenceMaps = async (): Promise<ReferenceMaps> => {
  if (!mapsPromise) {
    mapsPromise = Promise.all([loadAirportsInfo(), loadAirlinesInfo()])
      .then(([airports, airlines]) => {
        airportsCache = airports;
        airlinesCache = airlines;
        airportsLoaded = true;
        airlinesLoaded = true;
        maybeUpdateReferenceMaps();
        return referenceMapsCache;
      })
      .catch((error) => {
        mapsPromise = null;
        throw error;
      });
  }
  return mapsPromise;
};

// Read the current lookup maps (may be empty until loadReferenceMaps resolves).
export const getReferenceMapsSync = (): ReferenceMaps => referenceMapsCache;
