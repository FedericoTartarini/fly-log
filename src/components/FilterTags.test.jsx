import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, userEvent } from "../../test-utils/index.js";
import FilterTags from "./FilterTags.jsx";
import useFlightStore from "../store.ts";
import { DEFAULT_FILTERS } from "../utils/activeFilters.ts";

const flights = [
  {
    id: "1",
    departure_date: "2025-01-01",
    airline_iata: "QF",
    airline_name: "Qantas",
    departure_airport_iata: "SYD",
  },
  {
    id: "2",
    departure_date: "2025-02-01",
    airline_iata: "SQ",
    airline_name: "Singapore Airlines",
    departure_airport_iata: "SIN",
  },
];

const setFilters = (filters) =>
  useFlightStore.setState({
    allFlights: flights,
    filteredFlights: flights,
    filters: { ...DEFAULT_FILTERS, ...filters },
  });

describe("FilterTags", () => {
  beforeEach(() => setFilters({}));

  it("shows nothing while no filter is on", () => {
    render(<FilterTags />);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("removes only the filter whose × is pressed", async () => {
    setFilters({ airline: "QF", departureAirport: "SYD", fromYear: 2020 });
    render(<FilterTags />);

    expect(screen.getByText("Qantas")).toBeInTheDocument();
    expect(screen.getByText("From 2020")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove filter: Qantas" }),
    );

    const { filters, filteredFlights } = useFlightStore.getState();
    expect(filters.airline).toBeNull();
    expect(filters.departureAirport).toBe("SYD");
    expect(filters.fromYear).toBe(2020);
    expect(filteredFlights.map((f) => f.id)).toEqual(["1"]);
  });

  it("clears every filter with Clear all", async () => {
    setFilters({ when: "past", minDuration: 2 });
    render(<FilterTags />);

    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(useFlightStore.getState().filters).toEqual(DEFAULT_FILTERS);
  });
});
