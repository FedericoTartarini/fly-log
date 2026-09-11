import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));
// Recharts needs real layout to render bars; mock the chart itself so the
// test can assert on the data it was actually given instead of on SVG output.
vi.mock("@mantine/charts", () => ({
  __esModule: true,
  BarChart: ({ data }) => (
    <div data-testid="bar-chart">{JSON.stringify(data)}</div>
  ),
}));

import { render, screen } from "../../test-utils/index.js";
import FlightsByChart from "./FlightsByChart.jsx";
import useFlightStore from "../store.ts";
import { CHART_GROUPING, CHART_METRIC, TIME_GROUPING } from "../constants/filters.ts";

const mockedUseFlightStore = useFlightStore;

const BASE_STATE = {
  timeGrouping: TIME_GROUPING.MONTH,
  setTimeGrouping: vi.fn(),
  chartGrouping: CHART_GROUPING.COUNTRY,
  setChartGrouping: vi.fn(),
  chartMetric: CHART_METRIC.FLIGHTS,
  setChartMetric: vi.fn(),
};

const applyMockState = (overrides = {}) => {
  mockedUseFlightStore.mockImplementation((selector) => {
    const merged = { ...BASE_STATE, ...overrides };
    return typeof selector === "function" ? selector(merged) : merged;
  });
};

// One country with two short flights, one with a single long one: flight
// count and distance rank these countries in opposite order.
const flights = [
  { id: "1", departure_country: "US", distance_km: 100 },
  { id: "2", departure_country: "US", distance_km: 300 },
  { id: "3", departure_country: "FR", distance_km: 5000 },
];

describe("FlightsByChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates by flight count when the shared metric is flights", () => {
    applyMockState({ chartMetric: CHART_METRIC.FLIGHTS });
    render(<FlightsByChart filteredFlights={flights} />);

    const data = JSON.parse(screen.getByTestId("bar-chart").textContent);
    expect(data).toEqual([
      { country: "United States", departures: 2 },
      { country: "France", departures: 1 },
    ]);
  });

  it("aggregates by distance flown when the shared metric is distance", () => {
    applyMockState({ chartMetric: CHART_METRIC.DISTANCE });
    render(<FlightsByChart filteredFlights={flights} />);

    const data = JSON.parse(screen.getByTestId("bar-chart").textContent);
    expect(data).toEqual([
      { country: "France", departures: 5000 },
      { country: "United States", departures: 400 },
    ]);
  });
});
