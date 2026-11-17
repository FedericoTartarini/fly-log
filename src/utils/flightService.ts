import { firestore } from "../firebaseClient";
import { Timestamp } from "firebase/firestore";
import {
  collection,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { getReferenceMapsSync, loadReferenceMaps } from "./referenceData";
import { YEAR_FILTER } from "../constants/filters";
import { parseToDate, type DateLike } from "./dateUtils";
import {
  deriveFlightFields,
  derivedFieldsForWrite,
  isEnriched,
  type DerivedFlightFields,
} from "./flightEnrichment";

type FirestoreFlightRecord = {
  id: string;
  departure_date: DateLike;
  departure_airport_iata: string;
  arrival_airport_iata: string;
  airline_iata: string;
  [key: string]: unknown;
};

type EnrichedFlightRecord = FirestoreFlightRecord & DerivedFlightFields;

/**
 * Flights are enriched when they are written. This is the fallback for
 * documents saved before that, or with an older enrichment version: it needs
 * the reference maps to be loaded.
 */
export const enrichFlightData = (
  flight: FirestoreFlightRecord,
): EnrichedFlightRecord =>
  isEnriched(flight)
    ? (flight as EnrichedFlightRecord)
    : { ...flight, ...deriveFlightFields(flight, getReferenceMapsSync()) };

/**
 * Fetch flights filtered by year for the current user and enrich them.
 * @param uid - User ID
 * @param year - Year to filter by, or "all"
 * @returns Array of enriched flight objects
 */
const buildFlightsQuery = (uid: string, year: number | string) => {
  if (!uid) throw new Error("User id is required to fetch flights");
  if (!firestore) {
    throw new Error(
      "Firestore is not initialized. Please set Firebase config (VITE_FIREBASE_...) and initialize Firebase.",
    );
  }

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

  return q;
};

type FlightsSnapshot = { docs: { id: string; data: () => unknown }[] };

const enrichSnapshot = (snap: FlightsSnapshot): EnrichedFlightRecord[] =>
  snap.docs.map((d) =>
    enrichFlightData({
      id: d.id,
      ...(d.data() as Omit<FirestoreFlightRecord, "id">),
    } as FirestoreFlightRecord),
  );

/**
 * Subscribe to the user's flights. Firestore's persistent local cache means the
 * first callback fires synchronously from IndexedDB, before any network round
 * trip, and a second one lands when the server replies. Local writes echo back
 * through here immediately, so the UI updates without a refetch.
 *
 * @returns an unsubscribe function
 */
export const subscribeToUserFlights = (
  uid: string,
  year: number | string,
  onFlights: (flights: EnrichedFlightRecord[]) => void,
  onError: (error: Error) => void,
): (() => void) => {
  let cancelled = false;
  let latest: FlightsSnapshot | null = null;
  const toError = (error: unknown) =>
    error instanceof Error ? error : new Error(String(error));
  const mapsReady = () => getReferenceMapsSync().airportByIata.size > 0;
  const needsMaps = (snap: FlightsSnapshot) =>
    snap.docs.some((d) => !isEnriched(d.data() as Record<string, unknown>));

  // Flights carry their derived fields, so they render without the reference
  // maps. The maps still load alongside, for older documents that need
  // enriching here and for city names (getAirportCity), and the latest
  // snapshot is emitted again once they arrive.
  let mapsError: Error | null = null;
  loadReferenceMaps().then(
    () => {
      if (!cancelled && latest) onFlights(enrichSnapshot(latest));
    },
    (error) => {
      mapsError = toError(error);
      if (!cancelled && latest && needsMaps(latest)) onError(mapsError);
    },
  );

  let unsubscribe: () => void;
  try {
    unsubscribe = onSnapshot(
      buildFlightsQuery(uid, year),
      (snap) => {
        latest = snap;
        if (mapsReady() || !needsMaps(snap)) onFlights(enrichSnapshot(snap));
        else if (mapsError) onError(mapsError);
      },
      (error) => onError(error),
    );
  } catch (error) {
    // Reported asynchronously, like a listener error, so callers can rely on
    // the unsubscribe function existing first.
    queueMicrotask(() => onError(toError(error)));
    unsubscribe = () => {};
  }

  return () => {
    cancelled = true;
    unsubscribe();
  };
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
  // Clearing the arrival date in the form sends null, which must stay null.
  const arrivalDate = parseToDate(data.arrival_date);
  if (arrivalDate) data.arrival_date = Timestamp.fromDate(arrivalDate);

  // The derived fields depend on the whole flight, not just what changed.
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Updated flight not found");
  const merged = {
    ...(snap.data() as Omit<FirestoreFlightRecord, "id">),
    ...data,
    id: snap.id,
  } as FirestoreFlightRecord;
  const derived = await derivedFieldsForWrite(merged);

  await updateDoc(docRef, { ...data, ...derived });
  return enrichFlightData({ ...merged, ...derived });
};
