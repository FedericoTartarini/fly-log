import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import FlightsList from "./FlightsList";
import { enrichFlightData } from "../utils/flightService";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import useFlightStore from "../store";

// Mock the store
vi.mock("../store", () => {
  return {
    default: vi.fn(),
  };
});

// Create a mock flight
const mockFlight = {
  id: 1,
  departure_date: "2024-03-10",
  departure_airport_iata: "SFO",
  arrival_airport_iata: "SEA",
  airline_iata: "DL",
  flight_number: 3,
};

// Create an enriched version of the flight for testing
const enrichedFlight = enrichFlightData(mockFlight);

// Helper function to render with providers
const renderWithProvider = (component: React.ReactNode) =>
  render(
    <MemoryRouter>
      <MantineProvider>{component}</MantineProvider>
    </MemoryRouter>,
  );

describe("FlightsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders table rows for flights when flights are available", () => {
    // Mock the store to return flights
    useFlightStore.mockReturnValue({
      filteredFlights: [enrichedFlight],
    });

    renderWithProvider(<FlightsList />);

    expect(screen.getByText(/SFO → SEA/));
    expect(screen.getByText(/DL/));
    expect(screen.getByText(/3\/10\/2024/));
  });

  it("renders empty state when no flights are available", () => {
    // Mock the store to return no flights
    useFlightStore.mockReturnValue({
      filteredFlights: [],
    });

    renderWithProvider(<FlightsList />);

    expect(screen.getByText(/No flights to display for this selection/));
  });
});
