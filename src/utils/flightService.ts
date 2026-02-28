import { firestore } from "../firebaseClient";
import { Timestamp } from "firebase/firestore";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import {
  getReferenceMapsSync,
  loadReferenceMaps,
  type AirlineInfo,
  type AirportInfo,
} from "./referenceData";
import { YEAR_FILTER } from "../constants/filters";
import { parseToDate, type DateLike } from "./dateUtils";

type FirestoreFlightRecord = {
  id: string;
  departure_date: DateLike;
  departure_airport_iata: string;
  arrival_airport_iata: string;
  airline_iata: string;
  [key: string]: unknown;
};

type EnrichedFlightRecord = FirestoreFlightRecord & {
  departure_coordinates: [number, number] | null;
  arrival_coordinates: [number, number] | null;
  distance_km: number | null;
  flight_time: number | null;
  departure_country: string | null;
  arrival_country: string | null;
  international: boolean;
  airline_name: string | null;
  airline_icon_path: string | null;
  airline_icao: string | null;
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

/**
 * Get airport coordinates by IATA code.
 * @param iataCode - IATA code of the airport
 * @returns [latitude, longitude] if found, else null
 */
const getAirportCoordinates = (
  iataCode: string,
  airportByIata: Map<string, AirportInfo>,
): [number, number] | null => {
  const airport = airportByIata.get(String(iataCode || "").toUpperCase());
  return airport ? [airport.lat, airport.lon] : null;
};

/**
 * Get ISO country code by airport IATA code.
 * @param iataCode - IATA code of the airport
 * @returns ISO country code if found, else null
 */
const getIsoCountry = (
  iataCode: string,
  airportByIata: Map<string, AirportInfo>,
): string | null => {
  const airport = airportByIata.get(String(iataCode || "").toUpperCase());
  return airport ? airport.iso_country : null;
};

/**
 * Enrich flight data with additional information from airports and airlines data.
 * @param flight - Flight data from Firestore
 * @returns Enriched flight data
 */
export const enrichFlightData = (
  flight: FirestoreFlightRecord,
): EnrichedFlightRecord => {
  const { airportByIata, airlineByIata } = getReferenceMapsSync();

  const depCoords = getAirportCoordinates(
    flight.departure_airport_iata,
    airportByIata,
  );
  const depCountry = getIsoCountry(
    flight.departure_airport_iata,
    airportByIata,
  );
  const arrCoords = getAirportCoordinates(
    flight.arrival_airport_iata,
    airportByIata,
  );
  const arrCountry = getIsoCountry(flight.arrival_airport_iata, airportByIata);

  const distance = haversine(depCoords, arrCoords);
  const flightTime = estimateFlightTime(distance);

  const airline = airlineByIata.get(
    String(flight.airline_iata || "").toUpperCase(),
  ) as AirlineInfo | undefined;

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
 * Fetch flights filtered by year for the current user and enrich them.
 * @param uid - User ID
 * @param year - Year to filter by, or "all"
 * @returns Array of enriched flight objects
 */
export const getFilteredUserFlights = async (
  uid: string,
  year: number | string,
): Promise<EnrichedFlightRecord[]> => {
  if (!uid) throw new Error("User id is required to fetch flights");
  if (!firestore) {
    throw new Error(
      "Firestore is not initialized. Please set Firebase config (VITE_FIREBASE_...) and initialize Firebase.",
    );
  }
  await loadReferenceMaps();

  const colRef = collection(firestore, "flights", uid, "records");
  const todayDate = new Date();

  let q;
  if (year === YEAR_FILTER.UPCOMING) {
    q = query(
      colRef,
      where("departure_date", ">", Timestamp.fromDate(todayDate)),
      orderBy("departure_date", "desc"),
    );
  } else if (year === YEAR_FILTER.ALL) {
    q = query(colRef, orderBy("departure_date", "desc"));
  } else {
    const startDate = new Date(Number(year), 0, 1);
    let endDate = new Date(Number(year), 11, 31, 23, 59, 59);
    const thisYear = new Date().getFullYear().toString();
    if (String(year) === thisYear) {
      endDate = new Date(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        todayDate.getDate(),
        23,
        59,
        59,
        999,
      );
    }

    q = query(
      colRef,
      where("departure_date", ">=", Timestamp.fromDate(startDate)),
      where("departure_date", "<=", Timestamp.fromDate(endDate)),
      orderBy("departure_date", "desc"),
    );
  }

  const snap = await getDocs(q);
  const data = snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...(d.data() as Omit<FirestoreFlightRecord, "id">),
      }) as FirestoreFlightRecord,
  );
  return data.map((flight) => enrichFlightData(flight));
};

/**
 * Delete a flight document (hard delete) for a given user.
 * @param uid - User ID (must match Firestore path)
 * @param flightId - Document id of the flight to delete
 */
export const deleteFlightForUser = async (uid: string, flightId: string) => {
  if (!uid) throw new Error("User id is required to delete a flight");
  if (!flightId) throw new Error("Flight id is required to delete a flight");
  if (!firestore)
    throw new Error(
      "Firestore is not initialized. Please set Firebase config (VITE_FIREBASE_...) and initialize Firebase.",
    );

  const docRef = doc(firestore, "flights", uid, "records", flightId);
  return deleteDoc(docRef);
};

/**
 * Update a flight document for a given user and return the updated enriched flight.
 */
export const updateFlightForUser = async (
  uid: string,
  flightId: string,
  updates: Partial<FirestoreFlightRecord>,
) => {
  if (!uid) throw new Error("User id is required to update a flight");
  if (!flightId) throw new Error("Flight id is required to update a flight");
  if (!firestore)
    throw new Error(
      "Firestore is not initialized. Please set Firebase config (VITE_FIREBASE_...) and initialize Firebase.",
    );

  const docRef = doc(firestore, "flights", uid, "records", flightId);

  const data = { ...updates };
  if (data.departure_date) {
    const d = parseToDate(data.departure_date);
    if (!d) {
      throw new Error("Invalid departure_date");
    }
    data.departure_date = Timestamp.fromDate(d);
  }

  await updateDoc(docRef, data);

  // Return the fresh document enriched
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Updated flight not found");
  const merged = {
    id: snap.id,
    ...(snap.data() as Omit<FirestoreFlightRecord, "id">),
  } as FirestoreFlightRecord;
  return enrichFlightData(merged);
};
