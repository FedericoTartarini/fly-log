import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../test-utils/index.js";
import FlightsByChart from "./FlightsByChart.jsx";
import useFlightStore from "../store.ts";
import {
  CHART_GROUPING,
  CHART_METRIC,
  TIME_GROUPING,
} from "../constants/filters.ts";

const mockedUseFlightStore = useFlightStore;

// Label and value of each bar, in order.
const rowTexts = () =>
  [...document.querySelectorAll("[class^=_label_], [class^=_value_]")].map(
    (el) => el.textContent,
  );

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

    expect(rowTexts()).toEqual(["United States", "2", "France", "1"]);
  });

  it("aggregates by distance flown when the shared metric is distance", () => {
    applyMockState({ chartMetric: CHART_METRIC.DISTANCE });
    render(<FlightsByChart filteredFlights={flights} />);

    expect(rowTexts()).toEqual(["France", "5K", "United States", "400"]);
  });
});

describe("FlightsByChart bars", () => {
  it("shows 8 rows, then all of them after Show more, without clipping", async () => {
    applyMockState({ chartMetric: CHART_METRIC.FLIGHTS });
    const many = [
      "US",
      "FR",
      "IT",
      "DE",
      "ES",
      "GB",
      "JP",
      "AU",
      "NZ",
      "SG",
    ].map((country, i) => ({ id: String(i), departure_country: country }));
    render(<FlightsByChart filteredFlights={many} />);

    expect(rowTexts()).toHaveLength(16);
    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(rowTexts()).toHaveLength(20);
    expect(
      screen.getByRole("button", { name: "Show fewer" }),
    ).toBeInTheDocument();
  });

  it("names the busiest day under the day-of-week chart", () => {
    applyMockState({ timeGrouping: TIME_GROUPING.DAY_OF_WEEK });
    const data = [3, 1, 0, 0, 0, 0, 0].map((flights, i) => ({
      period: String(i),
      flights,
    }));
    render(<FlightsByChart data={data} />);

    expect(
      screen.getByText("Monday is your busiest day, with 3 flights."),
    ).toBeInTheDocument();
  });
});
