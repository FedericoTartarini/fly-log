// src/store.ts
import { create } from "zustand";
import { getFilteredUserFlights } from "./utils/flightService";
import { onAuthStateChanged } from "./firebaseClient";

let currentUid: string | null = null;
onAuthStateChanged((user) => {
  currentUid = user?.uid ?? null;
});

interface Flight {
  id: number;
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
}

const filterByYear = (flights: Flight[], year: string) => {
  if (!year || year === "all") return flights;
  return flights.filter((f) => {
    try {
      const d = new Date(f.departure_date);
      return d.getFullYear().toString() === year;
    } catch {
      return false;
    }
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
      if (!currentUid) {
        set({ allFlights: [], filteredFlights: [], isLoading: false });
        return;
      }

      // getFilteredUserFlights(currentUid, "all") should return all user flights
      const allFlights = await getFilteredUserFlights(currentUid, "all");
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
}));

export default useFlightStore;
