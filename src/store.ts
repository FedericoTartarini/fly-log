// src/store.ts
import { create } from "zustand";
import { getFilteredUserFlights } from "./utils/flightService";
import { onAuthStateChanged, auth } from "./firebaseClient";
import type { Unsubscribe } from "firebase/auth";
import { getYear, parseToDate } from "./utils/dateUtils";

let currentUid: string | null = null;
let authUnsubscribe: Unsubscribe | null = null;

const ensureAuthListener = (): Unsubscribe => {
  if (authUnsubscribe) return authUnsubscribe;
  authUnsubscribe = onAuthStateChanged((user) => {
    currentUid = user?.uid ?? null;
  });
  return authUnsubscribe;
};

export const clearAuthListener = () => {
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
    currentUid = null;
  }
};

interface Flight {
  id: string;
  departure_date: string;
  departure_airport_iata: string;
  arrival_airport_iata: string;
  airline_iata: string;
  flight_number: number;
}

interface FlightStoreState {
  allFlights: Flight[]; // master list from backend
  filteredFlights: Flight[]; // UI-facing filtered subset
  selectedYear: string;
  isLoading: boolean;
  error: string | null;
  fetchFlights: () => Promise<void>;
  setSelectedYear: (year: string) => Promise<void>;
  // remove a flight by id from both lists (optimistic UI)
  removeFlightById: (id: string) => void;
}

const filterByYear = (flights: Flight[], year: string) => {
  if (!year || year === "all") return flights;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (year === "upcoming") {
    return flights.filter((f) => {
      const dt = parseToDate((f as any).departure_date);
      return dt !== null && dt > today;
    });
  }

  if (year === "past") {
    return flights.filter((f) => {
      const dt = parseToDate((f as any).departure_date);
      return dt !== null && dt < today;
    });
  }

  // Numeric year
  return flights.filter((f) => {
    const y = getYear((f as any).departure_date);
    return y !== null && String(y) === year;
  });
};

const useFlightStore = create<FlightStoreState>((set, get) => ({
  allFlights: [],
  filteredFlights: [],
  selectedYear: "all",
  isLoading: false,
  error: null,

  fetchFlights: async () => {
    set({ isLoading: true, error: null });
    try {
      ensureAuthListener();
      const uid = auth.currentUser?.uid;
      if (!uid) {
        set({ allFlights: [], filteredFlights: [], isLoading: false });
        return;
      }

      // getFilteredUserFlights(uid, "all") should return all user flights
      const allFlights = await getFilteredUserFlights(uid, "all");
      const filteredFlights = filterByYear(allFlights, get().selectedYear);

      set({
        allFlights,
        filteredFlights,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setSelectedYear: async (year: string) => {
    set({ selectedYear: year, isLoading: true, error: null });
    try {
      const allFlights = get().allFlights;
      const filteredFlights = filterByYear(allFlights, year);
      set({ filteredFlights, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  removeFlightById: (id: string) => {
    set((state) => ({
      allFlights: state.allFlights.filter(
        (f: any) => String(f.id) !== String(id),
      ),
      filteredFlights: state.filteredFlights.filter(
        (f: any) => String(f.id) !== String(id),
      ),
    }));
  },
}));

export default useFlightStore;
