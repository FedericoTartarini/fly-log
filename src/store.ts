import { create } from "zustand";
import { getFilteredUserFlights } from "./utils/flightService";
import { onAuthStateChanged } from "./firebaseClient";

// Track current authenticated user's uid for non-react modules (store)
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
  flights: Flight[];
  filteredFlights: Flight[];
  allFlights: Flight[];
  selectedYear: string;
  isLoading: boolean;
  error: string | null;
  fetchFlights: () => Promise<void>;
  setSelectedYear: (year: string) => Promise<void>;
}

const useFlightStore = create<FlightStoreState>((set) => ({
  flights: [],
  filteredFlights: [],
  allFlights: [],
  selectedYear: "all",
  isLoading: false,
  error: null,

  fetchFlights: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!currentUid) {
        // Not authenticated yet; set empty results
        set({
          flights: [],
          filteredFlights: [],
          allFlights: [],
          isLoading: false,
        });
        return;
      }

      const flights = await getFilteredUserFlights(currentUid, "all");
      set({
        flights,
        filteredFlights: flights,
        allFlights: flights,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setSelectedYear: async (year: string) => {
    set({ selectedYear: year, isLoading: true, error: null });
    try {
      if (!currentUid) {
        set({ filteredFlights: [], isLoading: false });
        return;
      }
      const filteredFlights = await getFilteredUserFlights(currentUid, year);
      set({ filteredFlights, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));

export default useFlightStore;
