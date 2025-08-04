import { create } from "zustand";
import {
  getUserFlights,
  getFilteredUserFlights,
} from "./services/flightService";

const useFlightStore = create((set, get) => ({
  flights: [],
  filteredFlights: [],
  selectedYear: "all",
  isLoading: false,
  error: null,

  // Fetch all flights
  fetchFlights: async () => {
    set({ isLoading: true, error: null });
    try {
      const flights = await getUserFlights();
      set({ flights, filteredFlights: flights, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Set selected year and filter flights
  setSelectedYear: async (year) => {
    set({ selectedYear: year, isLoading: true, error: null });
    try {
      const filteredFlights = await getFilteredUserFlights(year);
      set({ filteredFlights, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));

export default useFlightStore;
