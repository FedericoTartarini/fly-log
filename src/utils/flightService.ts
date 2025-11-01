import { firestore } from "../firebaseClient";
import { Timestamp } from "firebase/firestore";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { airlinesInfo } from "./airlinesInfo";
import { airportsInfo } from "./airportsInfo";

/**
 * Calculate the great-circle distance between two points on the Earth surface.
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

/**
 * Get airport coordinates by IATA code
 * @param iataCode - IATA code of the airport
 * @returns [latitude, longitude] if found, else null
 */
const getAirportCoordinates = (iataCode: string): [number, number] | null => {
  const airport = airportsInfo.find((airport) => airport.iata === iataCode);
  return airport ? [airport.lat, airport.lon] : null;
};

/**
 * Get ISO country code by airport IATA code
 * @param iataCode - IATA code of the airport
 * @returns ISO country code if found, else null
 */
const getIsoCountry = (iataCode: string): string | null => {
  const airport = airportsInfo.find((airport) => airport.iata === iataCode);
  return airport ? airport.iso_country : null;
};

/**
 * Enrich flight data with additional information from airports and airlines data
 * @param flight - EnhancedFlight data from database
 * @returns Enriched flight data
 */
export const enrichFlightData = (flight: any): any => {
  const depCoords = getAirportCoordinates(flight.departure_airport_iata);
  const depCountry = getIsoCountry(flight.departure_airport_iata);
  const arrCoords = getAirportCoordinates(flight.arrival_airport_iata);
  const arrCountry = getIsoCountry(flight.arrival_airport_iata);

  const distance = haversine(depCoords, arrCoords);
  const flightTime = estimateFlightTime(distance);

  const airline = airlinesInfo.find((a: any) => a.iata === flight.airline_iata);

  let airlineName: string | null = null;
  let airlineIcao: string | null = null;
  let airlineIconPath: string | null = null;

  if (airline) {
    airlineIcao = airline.icao;
    airlineIconPath = `${airline.icao}.png`;
    airlineName = airline.name;
  }

  return {
    ...flight,
    departure_coordinates: depCoords,
    arrival_coordinates: arrCoords,
    distance_km: distance,
    flight_time: flightTime,
    departure_country: depCountry,
    arrival_country: arrCountry,
    international: depCountry !== arrCountry,
    airline_name: airlineName,
    airline_icon_path: airlineIconPath,
    airline_icao: airlineIcao,
  };
};

/**
 * Fetches flights filtered by year for the current user and enriches them with additional data
 * @param uid - User ID
 * @param year - Year to filter by, or "all"
 * @returns Array of filtered enriched flight objects
 */
export const getFilteredUserFlights = async (
  uid: string,
  year: number | string,
): Promise<any[]> => {
  if (!uid) throw new Error("User id is required to fetch flights");

  const colRef = collection(firestore, "flights", uid, "records");
  const todayDate = new Date();

  let q;
  if (year === "upcoming") {
    q = query(
      colRef,
      where("departure_date", ">", Timestamp.fromDate(todayDate)),
      orderBy("departure_date", "desc"),
    );
  } else if (year === "all") {
    q = query(colRef, orderBy("departure_date", "desc"));
  } else {
    const startDate = new Date(Number(year), 0, 1);
    let endDate = new Date(Number(year), 11, 31, 23, 59, 59);
    const thisYear = new Date().getFullYear().toString();
    if (String(year) === thisYear) {
      endDate = todayDate;
    }

    q = query(
      colRef,
      where("departure_date", ">=", Timestamp.fromDate(startDate)),
      where("departure_date", "<=", Timestamp.fromDate(endDate)),
      orderBy("departure_date", "desc"),
    );
  }

  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return (data || []).map((flight: any) => enrichFlightData(flight));
};
