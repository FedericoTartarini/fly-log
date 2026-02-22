// Mock the store
vi.mock("../store", () => {
  return {
    default: vi.fn(),
  };
});

import React from "react";
import { screen } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach, type Mock } from "vitest";
import FlightsList from "./FlightsList";
import { enrichFlightData } from "../utils/flightService";
import { MemoryRouter } from "react-router-dom";
import useFlightStore from "../store";
import { render } from "../../test-utils";
import type { enhancedFlight } from "../types/enhancedFlight";

// Create a mock flight
const mockFlight = {
  id: "1",
  departure_date: "2024-03-10",
  departure_airport_iata: "SFO",
  arrival_airport_iata: "SEA",
  airline_iata: "DL",
  flight_number: "3",
};

// Create an enriched version of the flight for testing
const enrichedFlight = enrichFlightData(mockFlight) as enhancedFlight;

type StoreShape = {
  filteredFlights: enhancedFlight[];
  fetchFlights: () => void;
};

describe("FlightsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders table rows for flights when flights are available", () => {
    // Mock the store to return flights
    const mockedUseFlightStore = useFlightStore as unknown as Mock;

    mockedUseFlightStore.mockImplementation(
      (selector: (state: StoreShape) => unknown) =>
        selector({
          filteredFlights: [enrichedFlight],
          fetchFlights: vi.fn(),
        }),
    );

    render(<FlightsList />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });

    expect(screen.getByText(/SFO → SEA/));
    expect(screen.getByText(/DL/));
    expect(screen.getByText(/10 Mar 24/));
  });

  it("renders empty state when no flights are available", () => {
    // Mock the store to return no flights
    const mockedUseFlightStore = useFlightStore as unknown as Mock;

    mockedUseFlightStore.mockImplementation(
      (selector: (state: StoreShape) => unknown) =>
        selector({
          filteredFlights: [],
          fetchFlights: vi.fn(),
        }),
    );

    render(<FlightsList />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });

    expect(screen.getByText(/No flights to display for this selection/));
  });
});
