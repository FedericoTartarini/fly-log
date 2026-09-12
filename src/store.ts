// src/store.ts
import { create } from "zustand";
import { subscribeToUserFlights } from "./utils/flightService";
import { onAuthStateChanged } from "./firebaseClient";
import type { Unsubscribe } from "firebase/auth";
import { getYear, parseToDate } from "./utils/dateUtils";
import {
  CHART_GROUPING,
  CHART_METRIC,
  TIME_GROUPING,
  YEAR_FILTER,
  type ChartGrouping,
  type ChartMetric,
  type TimeGrouping,
} from "./constants/filters";
import type { enhancedFlight } from "./types/enhancedFlight";

// Current auth subscription + user id used for fetching flights.
let authUnsubscribe: Unsubscribe | null = null;
let currentUid: string | null = null;
// Active Firestore listener for the signed-in user's flights.
let flightsUnsubscribe: (() => void) | null = null;

const stopFlightsListener = () => {
  flightsUnsubscribe?.();
  flightsUnsubscribe = null;
};

// Stop the Firebase auth listener and reset cached user id.
export const clearAuthListener = () => {
  stopFlightsListener();
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
    currentUid = null;
  }
};

export interface StoreFlightFilters {
  airline: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  minDuration: number | null;
  maxDuration: number | null;
}

export interface FlightStoreState {
  allFlights: enhancedFlight[]; // master list from backend
  filteredFlights: enhancedFlight[]; // UI-facing filtered subset
  selectedYear: string;
  timeGrouping: TimeGrouping;
  chartGrouping: ChartGrouping;
  chartMetric: ChartMetric;
  filters: StoreFlightFilters;
  isLoading: boolean;
  error: string | null;
  setSelectedYear: (year: string) => Promise<void>;
  setTimeGrouping: (grouping: TimeGrouping) => void;
  setChartGrouping: (grouping: ChartGrouping) => void;
  setChartMetric: (metric: ChartMetric) => void;
  setFilters: (filters: Partial<StoreFlightFilters>) => void;
  clearFilters: () => void;
}

// Reduce flights based on the selected year preset or explicit year.
const filterByYear = (flights: enhancedFlight[], year: string) => {
  if (!year || year === YEAR_FILTER.ALL) return flights;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (year === YEAR_FILTER.UPCOMING) {
    return flights.filter((f) => {
      const dt = parseToDate(f.departure_date);
      return dt !== null && dt >= today;
    });
  }

  if (year === YEAR_FILTER.PAST) {
    return flights.filter((f) => {
      const dt = parseToDate(f.departure_date);
      return dt !== null && dt < today;
    });
  }

  // Numeric year
  return flights.filter((f) => {
    const y = getYear(f.departure_date);
    return y !== null && String(y) === year;
  });
};

// Apply year + facet filters to produce the UI-facing subset.
const applyFilters = (
  flights: enhancedFlight[],
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

// Attach a live listener for the user's flights. The first callback comes
// straight from Firestore's persistent cache, so a returning visitor sees their
// flights without waiting on the network; the server result arrives moments
// later. Local writes echo back through the listener too, which is why adding,
// editing or deleting a flight needs no refetch and no optimistic bookkeeping.
const startFlightsListener = () => {
  stopFlightsListener();

  const uid = currentUid;
  if (!uid) {
    useFlightStore.setState({
      allFlights: [],
      filteredFlights: [],
      isLoading: false,
    });
    return;
  }

  useFlightStore.setState({ isLoading: true, error: null });

  flightsUnsubscribe = subscribeToUserFlights(
    uid,
    YEAR_FILTER.ALL,
    (allFlights) => {
      useFlightStore.setState((state) => ({
        allFlights,
        filteredFlights: applyFilters(
          allFlights,
          state.selectedYear,
          state.filters,
        ),
        isLoading: false,
      }));
    },
    (error) => useFlightStore.setState({ error: error.message, isLoading: false }),
  );
};

const useFlightStore = create<FlightStoreState>((set, get) => ({
  allFlights: [],
  filteredFlights: [],
  selectedYear: YEAR_FILTER.ALL,
  timeGrouping: TIME_GROUPING.DAY_OF_WEEK,
  chartMetric: CHART_METRIC.FLIGHTS,
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

  // Update the year filter and recompute the filtered list in memory.
  setSelectedYear: async (year: string) => {
    // Update selectedYear synchronously without toggling a loading state
    set({ selectedYear: year, error: null });
    try {
      const allFlights = get().allFlights;
      const filteredFlights = applyFilters(allFlights, year, get().filters);
      // Apply filtered results synchronously; no loading flash for in-memory work
      set({ filteredFlights, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
    }
  },

  setChartMetric: (metric: ChartMetric) => {
    set({ chartMetric: metric });
  },

  setTimeGrouping: (grouping: TimeGrouping) => {
    set({ timeGrouping: grouping });
  },

  setChartGrouping: (grouping: ChartGrouping) => {
    set({ chartGrouping: grouping });
  },

  // Patch filters and recompute filteredFlights without refetching.
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

  // Clear filters and recompute filteredFlights.
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

}));

export default useFlightStore;

// Initialize auth listener
authUnsubscribe = onAuthStateChanged((user) => {
  if (user) {
    currentUid = user.uid;
    startFlightsListener();
  } else {
    currentUid = null;
    stopFlightsListener();
    useFlightStore.setState({
      allFlights: [],
      filteredFlights: [],
      isLoading: false,
      error: null,
      selectedYear: YEAR_FILTER.ALL,
      timeGrouping: TIME_GROUPING.DAY_OF_WEEK,
      chartMetric: CHART_METRIC.FLIGHTS,
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
