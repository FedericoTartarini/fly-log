import { create } from "zustand";
import { getUserFlights, getFilteredUserFlights } from "./utils/flightService";

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
      const flights = await getUserFlights();
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
      const filteredFlights = await getFilteredUserFlights(year);
      set({ filteredFlights, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));

export default useFlightStore;
