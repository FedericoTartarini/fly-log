// Mock the store
vi.mock("../store", () => {
  return {
    default: vi.fn(),
  };
});

// A few known cities; anything else falls back to its code, as the real
// helper does before the reference data has loaded.
vi.mock("../utils/airportUtils", () => ({
  getAirportCity: (iata: string) =>
    ({ SYD: "Sydney", LHR: "London", MEL: "Melbourne" })[iata] ?? iata,
}));

import React from "react";
import { screen, fireEvent } from "@testing-library/react";
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
        }),
    );

    render(<FlightsList />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });

    expect(screen.getByText(/No flights to display for this selection/));
  });

  it("leads with city and country names, keeping the codes in the tooltip", () => {
    const mockedUseFlightStore = useFlightStore as unknown as Mock;
    const international = {
      ...enrichedFlight,
      id: "2",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "LHR",
      departure_country: "AU",
      arrival_country: "GB",
    };
    const domestic = {
      ...enrichedFlight,
      id: "3",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "MEL",
      departure_country: "AU",
      arrival_country: "AU",
    };
    mockedUseFlightStore.mockImplementation(
      (selector: (state: StoreShape) => unknown) =>
        selector({ filteredFlights: [international, domestic] }),
    );

    render(<FlightsList />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });

    expect(screen.getByText("Sydney → London")).toHaveAttribute(
      "title",
      "SYD → LHR",
    );
    expect(screen.getByText("Australia → United Kingdom")).toBeInTheDocument();
    // A domestic flight names its country once, not "Australia → Australia".
    expect(screen.getByText("Sydney → Melbourne")).toBeInTheDocument();
    expect(screen.getByText("Australia")).toBeInTheDocument();
    expect(screen.getByTestId("flight-details-open-2")).toHaveAttribute(
      "aria-label",
      "View flight details: Sydney to London",
    );
  });

  it("opens the flight details modal from the row's chevron button", async () => {
    const mockedUseFlightStore = useFlightStore as unknown as Mock;
    mockedUseFlightStore.mockImplementation(
      (selector: (state: StoreShape) => unknown) =>
        selector({
          filteredFlights: [enrichedFlight],
        }),
    );

    render(<FlightsList />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });

    expect(screen.getByTestId("flight-row-1")).not.toHaveAttribute("role");
    expect(screen.getByTestId("flight-details-open-1")).toHaveAttribute(
      "aria-label",
      "View flight details: SFO to SEA",
    );
    fireEvent.click(screen.getByTestId("flight-details-open-1"));

    expect(
      await screen.findByTestId("flight-details-edit-1"),
    ).toBeInTheDocument();
    expect(await screen.findByText("DL3")).toBeInTheDocument();
  });

  it("opens the flight details modal when anywhere on the row is clicked", async () => {
    const mockedUseFlightStore = useFlightStore as unknown as Mock;
    mockedUseFlightStore.mockImplementation(
      (selector: (state: StoreShape) => unknown) =>
        selector({
          filteredFlights: [enrichedFlight],
        }),
    );

    render(<FlightsList />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });

    fireEvent.click(screen.getByText(/SFO →/));

    expect(
      await screen.findByTestId("flight-details-edit-1"),
    ).toBeInTheDocument();
  });
});
