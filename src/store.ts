// src/store.ts
import { create } from "zustand";
import { getFilteredUserFlights } from "./utils/flightService";
import { onAuthStateChanged } from "./firebaseClient";
import type { Unsubscribe } from "firebase/auth";
import { getYear, parseToDate } from "./utils/dateUtils";
import {
  CHART_GROUPING,
  TIME_GROUPING,
  YEAR_FILTER,
  type ChartGrouping,
  type TimeGrouping,
} from "./constants/filters";

let authUnsubscribe: Unsubscribe | null = null;
let currentUid: string | null = null;

export const clearAuthListener = () => {
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
    currentUid = null;
  }
};

export interface StoreFlight {
  id: string;
  departure_date: string;
  departure_airport_iata: string;
  arrival_airport_iata: string;
  airline_iata: string;
  flight_number: number;
  airline_name?: string | null;
  flight_time?: number | null;
}

export interface StoreFlightFilters {
  airline: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  minDuration: number | null;
  maxDuration: number | null;
}

export interface FlightStoreState {
  allFlights: StoreFlight[]; // master list from backend
  filteredFlights: StoreFlight[]; // UI-facing filtered subset
  selectedYear: string;
  timeGrouping: TimeGrouping;
  chartGrouping: ChartGrouping;
  filters: StoreFlightFilters;
  isLoading: boolean;
  error: string | null;
  fetchFlights: () => Promise<void>;
  setSelectedYear: (year: string) => Promise<void>;
  setTimeGrouping: (grouping: TimeGrouping) => void;
  setChartGrouping: (grouping: ChartGrouping) => void;
  setFilters: (filters: Partial<StoreFlightFilters>) => void;
  clearFilters: () => void;
  // remove a flight by id from both lists (optimistic UI)
  removeFlightById: (id: string) => void;
  // restore a flight to both lists (rollback optimistic delete)
  restoreFlight: (flight: StoreFlight) => void;
}

const filterByYear = (flights: StoreFlight[], year: string) => {
  if (!year || year === YEAR_FILTER.ALL) return flights;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (year === YEAR_FILTER.UPCOMING) {
    return flights.filter((f) => {
      const dt = parseToDate((f as any).departure_date);
      return dt !== null && dt >= today;
    });
  }

  if (year === YEAR_FILTER.PAST) {
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
  flights: StoreFlight[],
  year: string,
  filters: StoreFlightFilters,
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
      return !(
        filters.maxDuration !== null && f.flight_time > filters.maxDuration
      );
    });
  }

  return result;
};

const useFlightStore = create<FlightStoreState>((set, get) => ({
  allFlights: [],
  filteredFlights: [],
  selectedYear: YEAR_FILTER.ALL,
  timeGrouping: TIME_GROUPING.DAY_OF_WEEK,
  chartGrouping: CHART_GROUPING.COUNTRY,
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

      // getFilteredUserFlights(uid, ALL) should return all user flights
      const allFlights = await getFilteredUserFlights(uid, YEAR_FILTER.ALL);
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

  setTimeGrouping: (grouping: TimeGrouping) => {
    set({ timeGrouping: grouping });
  },

  setChartGrouping: (grouping: ChartGrouping) => {
    set({ chartGrouping: grouping });
  },

  setFilters: (filters: Partial<StoreFlightFilters>) => {
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
      const cleared: StoreFlightFilters = {
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

  restoreFlight: (flight: StoreFlight) => {
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
      isLoading: false,
      error: null,
      selectedYear: YEAR_FILTER.ALL,
      timeGrouping: TIME_GROUPING.DAY_OF_WEEK,
      chartGrouping: CHART_GROUPING.COUNTRY,
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
