// src/store.ts
import { create } from "zustand";
import { getFilteredUserFlights } from "./utils/flightService";
import { onAuthStateChanged } from "./firebaseClient";
import type { Unsubscribe } from "firebase/auth";
import { getYear, parseToDate } from "./utils/dateUtils";

let authUnsubscribe: Unsubscribe | null = null;
let currentUid: string | null = null;

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
  airline_name?: string | null;
  flight_time?: number | null;
}

interface FlightFilters {
  airline: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  minDuration: number | null;
  maxDuration: number | null;
}

interface FlightStoreState {
  allFlights: Flight[]; // master list from backend
  filteredFlights: Flight[]; // UI-facing filtered subset
  selectedYear: string;
  filters: FlightFilters;
  isLoading: boolean;
  error: string | null;
  fetchFlights: () => Promise<void>;
  setSelectedYear: (year: string) => Promise<void>;
  setFilters: (filters: Partial<FlightFilters>) => void;
  clearFilters: () => void;
  // remove a flight by id from both lists (optimistic UI)
  removeFlightById: (id: string) => void;
  // restore a flight to both lists (rollback optimistic delete)
  restoreFlight: (flight: Flight) => void;
}

const filterByYear = (flights: Flight[], year: string) => {
  if (!year || year === "all") return flights;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (year === "upcoming") {
    return flights.filter((f) => {
      const dt = parseToDate((f as any).departure_date);
      return dt !== null && dt >= today;
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

const applyFilters = (
  flights: Flight[],
  year: string,
  filters: FlightFilters,
) => {
  let result = filterByYear(flights, year);

  if (filters.airline) {
    result = result.filter(
      (f) =>
        f.airline_iata === filters.airline ||
        f.airline_name === filters.airline,
    );
  }
  if (filters.departureAirport) {
    result = result.filter(
      (f) => f.departure_airport_iata === filters.departureAirport,
    );
  }
  if (filters.arrivalAirport) {
    result = result.filter(
      (f) => f.arrival_airport_iata === filters.arrivalAirport,
    );
  }
  if (filters.minDuration !== null || filters.maxDuration !== null) {
    result = result.filter((f) => {
      if (typeof f.flight_time !== "number") return false;
      if (filters.minDuration !== null && f.flight_time < filters.minDuration) {
        return false;
      }
      if (filters.maxDuration !== null && f.flight_time > filters.maxDuration) {
        return false;
      }
      return true;
    });
  }

  return result;
};

const useFlightStore = create<FlightStoreState>((set, get) => ({
  allFlights: [],
  filteredFlights: [],
  selectedYear: "all",
  filters: {
    airline: null,
    departureAirport: null,
    arrivalAirport: null,
    minDuration: null,
    maxDuration: null,
  },
  isLoading: true,
  error: null,

  fetchFlights: async () => {
    set({ isLoading: true, error: null });
    try {
      const uid = currentUid;
      if (!uid) {
        set({ allFlights: [], filteredFlights: [], isLoading: false });
        return;
      }

      // getFilteredUserFlights(uid, "all") should return all user flights
      const allFlights = await getFilteredUserFlights(uid, "all");
      const filteredFlights = applyFilters(
        allFlights,
        get().selectedYear,
        get().filters,
      );

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
      const filteredFlights = applyFilters(allFlights, year, get().filters);
      set({ filteredFlights, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setFilters: (filters: Partial<FlightFilters>) => {
    set((state) => {
      const nextFilters = { ...state.filters, ...filters };
      return {
        filters: nextFilters,
        filteredFlights: applyFilters(
          state.allFlights,
          state.selectedYear,
          nextFilters,
        ),
      };
    });
  },

  clearFilters: () => {
    set((state) => {
      const cleared: FlightFilters = {
        airline: null,
        departureAirport: null,
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      };
      return {
        filters: cleared,
        filteredFlights: applyFilters(
          state.allFlights,
          state.selectedYear,
          cleared,
        ),
      };
    });
  },

  removeFlightById: (id: string) => {
    set((state) => {
      const newAllFlights = state.allFlights.filter(
        (f: any) => String(f.id) !== String(id),
      );
      return {
        allFlights: newAllFlights,
        filteredFlights: applyFilters(
          newAllFlights,
          state.selectedYear,
          state.filters,
        ),
      };
    });
  },

  restoreFlight: (flight: Flight) => {
    set((state) => {
      const newAllFlights = [...state.allFlights, flight].sort((a, b) => {
        const dateA = parseToDate(a.departure_date);
        const dateB = parseToDate(b.departure_date);
        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
      });
      return {
        allFlights: newAllFlights,
        filteredFlights: applyFilters(
          newAllFlights,
          state.selectedYear,
          state.filters,
        ),
      };
    });
  },
}));

export default useFlightStore;

// Initialize auth listener
authUnsubscribe = onAuthStateChanged((user) => {
  if (user) {
    currentUid = user.uid;
    useFlightStore.getState().fetchFlights();
  } else {
    currentUid = null;
    useFlightStore.setState({
      allFlights: [],
      filteredFlights: [],
      selectedYear: "all",
      filters: {
        airline: null,
        departureAirport: null,
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      },
    });
  }
});
