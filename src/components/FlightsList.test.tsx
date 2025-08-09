import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, afterEach, vi, expect } from "vitest";
import FlightsList from "./FlightsList";

// Mock the useFlightStore hook
vi.mock("../store", () => ({
  __esModule: true,
  default: vi.fn(),
}));

const mockUseFlightStore = require("../store").default;

describe("FlightsList", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no flights", () => {
    mockUseFlightStore.mockReturnValue({ filteredFlights: [] });
    render(<FlightsList />);
    expect(
      screen.getByText(/No flights to display for this selection/i),
    ).toBeInTheDocument();
  });

  it("renders table rows for flights", () => {
    mockUseFlightStore.mockReturnValue({
      filteredFlights: [
        {
          airline_icon_path: "test.png",
          airline_name: "TestAir",
          airline_iata: "TA",
          flight_number: "123",
          departure_airport_iata: "AAA",
          arrival_airport_iata: "BBB",
          departure_date: "2024-01-01T00:00:00Z",
          flight_time: 2.5,
          distance_km: 1000,
        },
      ],
    });
    render(<FlightsList />);
    expect(screen.getByText(/AAA → BBB/)).toBeInTheDocument();
    expect(screen.getByText(/TestAir/)).toBeInTheDocument();
    expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/2h 30m, 1,000 km/)).toBeInTheDocument();
  });
});
