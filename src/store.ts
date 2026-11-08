// src/store.ts
import { create } from "zustand";
import { subscribeToUserFlights } from "./utils/flightService";
import { onAuthStateChanged } from "./firebaseClient";
import type { Unsubscribe } from "firebase/auth";
import {
  CHART_GROUPING,
  CHART_METRIC,
  TIME_GROUPING,
  YEAR_FILTER,
  type ChartGrouping,
  type ChartMetric,
  type TimeGrouping,
  type YearFilterPreset,
} from "./constants/filters";
import { filterFlightsForFacetOptions } from "./utils/flightFilterFacets";
import { DEFAULT_FILTERS } from "./utils/activeFilters";
import { FLIGHT_ENTRY_TABS, type FlightEntryTab } from "./constants/tabs";
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
  when: YearFilterPreset;
  // Null means no bound, so the range runs to the first or last flight.
  fromYear: number | null;
  toYear: number | null;
  airline: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  minDuration: number | null;
  maxDuration: number | null;
}

export interface FlightStoreState {
  allFlights: enhancedFlight[]; // master list from backend
  filteredFlights: enhancedFlight[]; // UI-facing filtered subset
  timeGrouping: TimeGrouping;
  chartGrouping: ChartGrouping;
  chartMetric: ChartMetric;
  filters: StoreFlightFilters;
  isLoading: boolean;
  error: string | null;
  setTimeGrouping: (grouping: TimeGrouping) => void;
  setChartGrouping: (grouping: ChartGrouping) => void;
  setChartMetric: (metric: ChartMetric) => void;
  setFilters: (filters: Partial<StoreFlightFilters>) => void;
  clearFilters: () => void;
  // The add-flight form lives in the app shell, so any page can open it,
  // on a chosen tab (AI chat unless the caller asks for another).
  addFlightOpened: boolean;
  addFlightTab: FlightEntryTab;
  setAddFlightOpened: (opened: boolean, tab?: FlightEntryTab) => void;
}

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
        filteredFlights: filterFlightsForFacetOptions(
          allFlights,
          state.filters,
        ),
        isLoading: false,
      }));
    },
    (error) =>
      useFlightStore.setState({ error: error.message, isLoading: false }),
  );
};

const useFlightStore = create<FlightStoreState>((set) => ({
  allFlights: [],
  filteredFlights: [],
  timeGrouping: TIME_GROUPING.DAY_OF_WEEK,
  chartMetric: CHART_METRIC.FLIGHTS,
  chartGrouping: CHART_GROUPING.COUNTRY,
  filters: DEFAULT_FILTERS,
  isLoading: true,
  error: null,
  addFlightOpened: false,
  addFlightTab: FLIGHT_ENTRY_TABS.AI,
  setAddFlightOpened: (
    opened: boolean,
    tab: FlightEntryTab = FLIGHT_ENTRY_TABS.AI,
  ) => set({ addFlightOpened: opened, addFlightTab: tab }),

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
        filteredFlights: filterFlightsForFacetOptions(
          state.allFlights,
          nextFilters,
        ),
      };
    });
  },

  // Clear filters and recompute filteredFlights.
  clearFilters: () => {
    set((state) => ({
      filters: DEFAULT_FILTERS,
      filteredFlights: state.allFlights,
    }));
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
      timeGrouping: TIME_GROUPING.DAY_OF_WEEK,
      chartMetric: CHART_METRIC.FLIGHTS,
      chartGrouping: CHART_GROUPING.COUNTRY,
      filters: DEFAULT_FILTERS,
    });
  }
});
