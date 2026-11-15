import {
  getReferenceMapsSync,
  loadReferenceMaps,
  type AirportInfo,
  type ReferenceMaps,
} from "./referenceData";
import { estimateCo2Kg } from "./emissions";
import { getAirMinutes, type RunwayLeg } from "./airTime";

/**
 * Bump this when anything below changes the stored numbers (a new emissions
 * factor, a different speed estimate). Documents with an older version are
 * enriched again on read until the backfill script rewrites them.
 */
export const ENRICHMENT_VERSION = 1;

/** The fields a flight needs to derive the rest. */
export type FlightCore = {
  departure_airport_iata: string;
  arrival_airport_iata: string;
  airline_iata: string;
  cabin_class?: unknown;
  flight_status?: unknown;
  [key: string]: unknown;
};

export type DerivedFlightFields = {
  departure_coordinates: [number, number] | null;
  arrival_coordinates: [number, number] | null;
  distance_km: number | null;
  /** Hours: the real time in the air when a status check saved runway times, else an estimate. */
  flight_time: number | null;
  departure_country: string | null;
  arrival_country: string | null;
  international: boolean;
  airline_name: string | null;
  airline_icon_path: string | null;
  airline_icao: string | null;
  co2_kg: number;
  enrichment_version: number;
};

/**
 * Calculate the great-circle distance between two points on Earth.
 * @param coord1 - [latitude, longitude] of the first point in decimal degrees
 * @param coord2 - [latitude, longitude] of the second point in decimal degrees
 * @returns Distance in kilometers, or null if coordinates are invalid
 */
const haversine = (
  coord1: [number, number] | null,
  coord2: [number, number] | null,
): number | null => {
  if (!coord1 || !coord2) return null;

  const R = 6371;
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Estimate flight time based on distance and average speed.
 * @param distanceKm - Distance in kilometers
 * @param avgSpeedKmh - Average speed in km/h (default: 900)
 * @returns Estimated flight time in hours, or null if distance is null
 */
const estimateFlightTime = (
  distanceKm: number | null,
  avgSpeedKmh = 900,
): number | null => {
  if (distanceKm === null) return null;
  return distanceKm / avgSpeedKmh;
};

const findAirport = (
  iataCode: string,
  airportByIata: Map<string, AirportInfo>,
): AirportInfo | undefined =>
  airportByIata.get(String(iataCode || "").toUpperCase());

/**
 * Derive the stored fields (coordinates, distance, time, countries, airline,
 * emissions) from a flight's airports, airline, cabin and status check.
 */
export const deriveFlightFields = (
  flight: FlightCore,
  { airportByIata, airlineByIata }: ReferenceMaps,
): DerivedFlightFields => {
  const dep = findAirport(flight.departure_airport_iata, airportByIata);
  const arr = findAirport(flight.arrival_airport_iata, airportByIata);
  const depCoords: [number, number] | null = dep ? [dep.lat, dep.lon] : null;
  const arrCoords: [number, number] | null = arr ? [arr.lat, arr.lon] : null;
  const depCountry = dep?.iso_country ?? null;
  const arrCountry = arr?.iso_country ?? null;
  const international = depCountry !== arrCountry;

  const distance = haversine(depCoords, arrCoords);
  // A status check that saved runway times knows the real time in the air.
  const status = flight.flight_status as
    | { departure?: RunwayLeg; arrival?: RunwayLeg }
    | null
    | undefined;
  const airMinutes = getAirMinutes(status?.departure, status?.arrival);

  const airline = airlineByIata.get(
    String(flight.airline_iata || "").toUpperCase(),
  );

  return {
    departure_coordinates: depCoords,
    arrival_coordinates: arrCoords,
    distance_km: distance,
    flight_time:
      airMinutes !== null ? airMinutes / 60 : estimateFlightTime(distance),
    departure_country: depCountry,
    arrival_country: arrCountry,
    international,
    co2_kg: estimateCo2Kg({
      distance_km: distance,
      international,
      cabin_class: flight.cabin_class,
    }),
    airline_name: airline?.name ?? null,
    airline_icon_path: airline ? `${airline.icao}.png` : null,
    airline_icao: airline?.icao ?? null,
    enrichment_version: ENRICHMENT_VERSION,
  };
};

/** Whether a stored flight already carries current derived fields. */
export const isEnriched = (flight: Record<string, unknown>) =>
  typeof flight.enrichment_version === "number" &&
  flight.enrichment_version >= ENRICHMENT_VERSION;

/**
 * The derived fields to store alongside a flight that is about to be written.
 * If the reference data cannot be loaded (offline on a first launch), the
 * flight is still saved, marked unenriched so the read path fills it in.
 */
export const derivedFieldsForWrite = async (
  flight: FlightCore,
): Promise<DerivedFlightFields | { enrichment_version: null }> => {
  try {
    await loadReferenceMaps();
  } catch (error) {
    console.warn("Saving flight without derived fields", error);
    return { enrichment_version: null };
  }
  return deriveFlightFields(flight, getReferenceMapsSync());
};
