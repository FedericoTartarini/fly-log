import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));
vi.mock("../components/WorldMap.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="world-map" />,
}));
vi.mock("../components/StatsSummary.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="stats-summary" />,
}));
vi.mock("../components/FlightsTopBar.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="flights-top-bar" />,
}));
vi.mock("../components/DistanceStatsCard.js", () => ({
  __esModule: true,
  default: () => <div data-testid="distance-card" />,
}));
vi.mock("../components/FlightCard.tsx", () => ({
  __esModule: true,
  default: () => <div data-testid="flight-card" />,
}));
vi.mock("../components/FlightsByChart.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="flights-by-chart" />,
}));

import { render, screen, waitFor } from "../../test-utils/index.js";
import FlightsStats from "./FlightsStats";
import useFlightStore from "../store.ts";
import { TIME_GROUPING } from "../constants/filters.ts";

const mockedUseFlightStore = useFlightStore;

const BASE_STATE = {
  filteredFlights: [],
  allFlights: [],
  isLoading: false,
  error: null,
  timeGrouping: TIME_GROUPING.DAY_OF_WEEK,
};

const applyMockState = (overrides = {}) => {
  mockedUseFlightStore.mockImplementation((selector) => {
    const merged = { ...BASE_STATE, ...overrides };
    return typeof selector === "function" ? selector(merged) : merged;
  });
};

describe("FlightsStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loader while flights are being fetched", async () => {
    applyMockState({ isLoading: true });

    render(<FlightsStats />);

    await waitFor(() => {
      expect(
        document.querySelector(".mantine-Loader-root"),
      ).toBeInTheDocument();
    });
  });

  it("displays an error message when fetching fails", () => {
    applyMockState({ error: "Network error", isLoading: false });

    render(<FlightsStats />);

    expect(
      screen.getByText("Error loading flight data: Network error"),
    ).toBeInTheDocument();
  });

  it("renders the dashboard content, including the filter button, when flights exist", async () => {
    const flights = [
      {
        id: "1",
        departure_date: "2025-06-21",
        departure_airport_iata: "JFK",
        arrival_airport_iata: "LHR",
        airline_name: "Example Airlines",
        flight_number: "EA1",
        departure_country: "US",
        arrival_country: "GB",
        departure_coordinates: [40.6413, -73.7781],
        arrival_coordinates: [51.47, -0.4543],
        distance_km: 5567,
        flight_time: 7.5,
      },
      {
        id: "2",
        departure_date: "2025-07-15",
        departure_airport_iata: "LAX",
        arrival_airport_iata: "NRT",
        airline_name: "Sample Air",
        flight_number: "SA7",
        departure_country: "US",
        arrival_country: "JP",
        departure_coordinates: [33.9416, -118.4085],
        arrival_coordinates: [35.7767, 140.3189],
        distance_km: 8816,
        flight_time: 10,
      },
    ];

    applyMockState({
      filteredFlights: flights,
      allFlights: flights,
      isLoading: false,
      error: null,
      timeGrouping: TIME_GROUPING.DAY_OF_WEEK,
    });

    render(<FlightsStats />);

    await waitFor(() => {
      expect(screen.getByTestId("world-map")).toBeInTheDocument();
    });

    expect(screen.getByTestId("stats-summary")).toBeInTheDocument();
    expect(screen.getByTestId("distance-card")).toBeInTheDocument();
    expect(screen.getAllByTestId("flight-card")).toHaveLength(2);
    expect(screen.getByTestId("flights-top-bar")).toBeInTheDocument();
    expect(screen.getAllByTestId("flights-by-chart")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /Filter Flights/i }),
    ).toBeInTheDocument();
  });
});
