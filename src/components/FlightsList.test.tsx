import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, afterEach, vi, expect, beforeEach } from "vitest";
import FlightsList from "./FlightsList";
import { enrichFlightData } from "../utils/flightService.ts";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import useFlightStore from "../store";

// Mock window.matchMedia for Mantine
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Mock supabaseClient
vi.mock("../supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

// Mock realistic flight data for the tests
const mockSetSelectedYear = vi.fn();
const mockFlights = [
  {
    id: 1,
    departure_date: "2024-03-10",
    departure_airport_iata: "SFO",
    arrival_airport_iata: "SEA",
    airline_iata: "DL",
    flight_number: 3,
  },
];

const enrichedFlights = (mockFlights || []).map((flight) =>
  enrichFlightData(flight),
);

vi.mock("../store", () => ({
  __esModule: true,
  default: vi.fn(() => ({
    selectedYear: "all",
    setSelectedYear: mockSetSelectedYear,
    flights: enrichedFlights,
    filteredFlights: enrichedFlights,
    allFlights: enrichedFlights,
    isLoading: false,
    error: null,
  })),
}));

const renderWithProvider = (component) =>
  render(
    <MemoryRouter>
      <MantineProvider>{component}</MantineProvider>
    </MemoryRouter>,
  );

describe("FlightsList", () => {
  beforeEach(() => {
    mockSetSelectedYear.mockClear();
    useFlightStore.mockImplementation(() => ({
      selectedYear: "all",
      setSelectedYear: mockSetSelectedYear,
      flights: enrichedFlights,
      filteredFlights: enrichedFlights,
      allFlights: enrichedFlights,
      isLoading: false,
      error: null,
    }));
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders table rows for flights", () => {
    renderWithProvider(<FlightsList />);
    expect(screen.getByText(/SFO → SEA/));
    expect(screen.getByText(/DL/));
    expect(screen.getByText(/3\/10\/2024/));
  });
});
