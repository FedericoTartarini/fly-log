import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
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
  {
    id: "f3",
    departure_date: "2025-03-01",
    departure_airport_iata: "BLQ",
    arrival_airport_iata: "FCO",
    airline_iata: "AZ",
    airline_name: "ITA Airways",
    flight_time: 1,
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

  it("auto-clears invalid arrival when other active filters make it impossible", async () => {
    useFlightStore.setState({
      allFlights: sampleFlights,
      filteredFlights: sampleFlights,
      selectedYear: "all",
      filters: {
        airline: "AZ",
        departureAirport: "BLQ",
        arrivalAirport: "LHR",
        minDuration: null,
        maxDuration: null,
      },
    });

    render(<FlightFilters />);

    await waitFor(() => {
      const state = useFlightStore.getState();
      expect(state.filters.arrivalAirport).toBeNull();
      expect(state.filters.airline).toBe("AZ");
      expect(state.filters.departureAirport).toBe("BLQ");
    });
  });
});
