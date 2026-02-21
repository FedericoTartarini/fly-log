import React from "react";
import { render, screen, userEvent, waitFor } from "../../test-utils/index.js";
import FlightFilters from "./FlightFilters";
import useFlightStore from "../store";

const sampleFlights = [
  {
    id: "f1",
    departure_date: "2025-01-01",
    departure_airport_iata: "JFK",
    arrival_airport_iata: "LHR",
    airline_iata: "AA",
    airline_name: "American Airlines",
    flight_time: 7.5,
  },
  {
    id: "f2",
    departure_date: "2025-02-01",
    departure_airport_iata: "LAX",
    arrival_airport_iata: "NRT",
    airline_iata: "JL",
    airline_name: "Japan Airlines",
    flight_time: 11.25,
  },
];

describe("FlightFilters", () => {
  beforeEach(() => {
    // reset store
    useFlightStore.setState({
      allFlights: sampleFlights,
      filteredFlights: sampleFlights,
      selectedYear: "all",
      filters: {
        airline: null,
        departureAirport: null,
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      },
    });
  });

  it("shows Clear button disabled initially and clears filters when clicked", async () => {
    render(<FlightFilters />);

    const clearButton = screen.getByTestId("filters-clear");
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toBeDisabled();

    // Set filters programmatically to simulate user selecting something
    await waitFor(() => {
      useFlightStore.getState().setFilters({ airline: "AA", minDuration: 1 });
    });

    // Wait for the UI to reflect the enabled button
    await waitFor(() =>
      expect(screen.getByTestId("filters-clear")).toBeEnabled(),
    );

    // Click clear and assert store is reset
    await userEvent.click(screen.getByTestId("filters-clear"));

    await waitFor(() => {
      const state = useFlightStore.getState();
      expect(state.filters.airline).toBeNull();
      expect(state.filters.minDuration).toBeNull();
      expect(state.filteredFlights.length).toBe(sampleFlights.length);
    });
  });
});
