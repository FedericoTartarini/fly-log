import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));
vi.mock("../components/FlightsTopBar.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="flights-top-bar" />,
}));

import { render, screen, waitFor } from "../../test-utils/index.js";
import Timeline from "./Timeline";
import useFlightStore from "../store.ts";
import { CHART_METRIC } from "../constants/filters.ts";

const mockedUseFlightStore = useFlightStore;

const BASE_STATE = {
  allFlights: [],
  isLoading: false,
  chartMetric: CHART_METRIC.FLIGHTS,
  setChartMetric: vi.fn(),
};

const applyMockState = (overrides = {}) => {
  mockedUseFlightStore.mockImplementation((selector) => {
    const merged = { ...BASE_STATE, ...overrides };
    return typeof selector === "function" ? selector(merged) : merged;
  });
};

const flights = [
  { id: "1", departure_date: "2025-03-10T08:00:00Z", distance_km: 700 },
  { id: "2", departure_date: "2025-03-20T20:00:00Z", distance_km: 800 },
  { id: "3", departure_date: "2024-07-15T09:00:00Z", distance_km: 12000 },
];

const cy = (id) => document.querySelector(`[data-cy="${id}-value"]`);

describe("Timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loader while flights are being fetched", async () => {
    applyMockState({ isLoading: true });
    render(<Timeline />);
    await waitFor(() => {
      expect(document.querySelector(".mantine-Loader-root")).toBeInTheDocument();
    });
  });

  it("shows the add-flight call to action when there are no flights", async () => {
    applyMockState({ allFlights: [] });
    render(<Timeline />);
    await waitFor(() => {
      expect(screen.getByTestId("flights-top-bar")).toBeInTheDocument();
    });
  });

  it("renders a year row per year with matrix stats", async () => {
    applyMockState({ allFlights: flights });
    render(<Timeline />);

    // One row per year present in the data.
    await waitFor(() => {
      expect(screen.getByText("2024")).toBeInTheDocument();
    });
    expect(screen.getByText("2025")).toBeInTheDocument();

    // Stats reflect 3 flights across 2 active months (Jul 2024, Mar 2025).
    expect(cy("timeline-total-flights")).toHaveTextContent("3");
    expect(cy("timeline-active-months")).toHaveTextContent("2");
    // Busiest month is March 2025 with 2 flights.
    expect(cy("timeline-busiest-month")).toHaveTextContent("2025");
    expect(cy("timeline-busiest-month")).toHaveTextContent("(2)");
  });

  it("labels the legend from zero up to the busiest month's count", async () => {
    applyMockState({ allFlights: flights });
    render(<Timeline />);

    await waitFor(() => {
      expect(screen.getByText("No flights")).toBeInTheDocument();
    });
    // The darkest swatch shown must be the one the right-hand label describes,
    // so the label tracks the data rather than the fixed 4+ bucket.
    expect(screen.getByText("2 flights")).toBeInTheDocument();
  });

  it("switches the heatmap to kilometres", async () => {
    applyMockState({
      allFlights: flights,
      chartMetric: CHART_METRIC.DISTANCE,
    });
    render(<Timeline />);

    // Totals and the legend are in kilometres, not flight counts.
    await waitFor(() => {
      expect(cy("timeline-total-flights")).toHaveTextContent("13,500 km");
    });
    expect(screen.getByText("12,000 km")).toBeInTheDocument();
    // Jul 2024 (12,000 km) beats Mar 2025 (1,500 km), the reverse of the
    // flight-count ranking.
    expect(cy("timeline-busiest-month")).toHaveTextContent("2024");
  });
});
