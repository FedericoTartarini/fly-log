import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));
vi.mock("../components/FlightsList.tsx", () => ({
  __esModule: true,
  default: () => <div data-testid="flights-list" />,
}));
vi.mock("../components/NoFlightsCard.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="no-flights-card" />,
}));

import { render, screen } from "../../test-utils/index.js";
import Flights from "./Flights";
import useFlightStore from "../store.ts";
import { DEFAULT_FILTERS } from "../utils/activeFilters.ts";

const flight = (id, departure_date) => ({ id, departure_date });

const applyMockState = (overrides = {}) => {
  const state = {
    allFlights: [],
    filteredFlights: [],
    filters: DEFAULT_FILTERS,
    isLoading: false,
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  };
  useFlightStore.mockImplementation((selector) => selector(state));
};

describe("Flights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts every flight since the first year, with no filter tags", async () => {
    const flights = [flight("a", "1993-05-01"), flight("b", "2024-01-01")];
    applyMockState({ allFlights: flights, filteredFlights: flights });

    render(<Flights />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Flights",
    );
    expect(screen.getByText("2 flights since 1993")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Active filters" })).toBeNull();
    expect(await screen.findByTestId("flights-list")).toBeInTheDocument();
  });

  it("counts one filtered flight out of the total and shows the tags", () => {
    const flights = [flight("a", "2023-05-01"), flight("b", "2024-01-01")];
    applyMockState({
      allFlights: flights,
      filteredFlights: [flights[1]],
      filters: { ...DEFAULT_FILTERS, fromYear: 2024, toYear: 2024 },
    });

    render(<Flights />);

    expect(
      screen.getByText("1 of 2 flights matches your filters"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Active filters" }),
    ).toBeInTheDocument();
  });

  it("leaves the year out when no flight has a readable date", () => {
    const flights = [flight("a", null)];
    applyMockState({ allFlights: flights, filteredFlights: flights });

    render(<Flights />);

    expect(screen.getByText("1 flight")).toBeInTheDocument();
  });
});
