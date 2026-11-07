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
import { screen, fireEvent, within } from "@testing-library/react";
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

const renderWith = (filteredFlights: enhancedFlight[]) => {
  const mockedUseFlightStore = useFlightStore as unknown as Mock;
  mockedUseFlightStore.mockImplementation(
    (selector: (state: StoreShape) => unknown) => selector({ filteredFlights }),
  );
  render(<FlightsList />, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    ),
  });
};

describe("FlightsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows each flight as a row with codes, cities, date and flight number", () => {
    renderWith([
      {
        ...enrichedFlight,
        departure_airport_iata: "SYD",
        arrival_airport_iata: "LHR",
        airline_name: "Delta",
        distance_km: 16993.4,
      },
    ]);

    const row = screen.getByTestId("flight-row-1");
    expect(row.tagName).toBe("BUTTON");
    expect(row).toHaveTextContent("SYD");
    expect(row).toHaveTextContent("LHR");
    expect(row).toHaveTextContent("Sydney to London");
    expect(row).toHaveTextContent("10 Mar");
    expect(row).toHaveTextContent("DL3");
    // Screen readers hear the whole flight in one sentence.
    expect(row).toHaveAccessibleName(
      "Sydney to London, 10 Mar 2024, Delta DL3, 16,993 km",
    );
  });

  it("renders empty state when no flights are available", () => {
    renderWith([]);
    expect(screen.getByText(/No flights to display for this selection/));
  });

  it("groups flights by year under headings with count and distance", () => {
    renderWith([
      {
        ...enrichedFlight,
        id: "a",
        departure_date: "2024-03-10",
        distance_km: 1000,
      },
      {
        ...enrichedFlight,
        id: "b",
        departure_date: "2099-01-05",
        distance_km: 500,
      },
      {
        ...enrichedFlight,
        id: "c",
        departure_date: "2024-07-01",
        distance_km: 1234,
      },
      {
        ...enrichedFlight,
        id: "d",
        departure_date: "2023-02-01",
        distance_km: 10,
      },
    ]);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Upcoming1 flight · 500 km",
      "20242 flights · 2,234 km",
      "20231 flight · 10 km",
    ]);
    // Newest first inside a year.
    const rows = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("data-testid"));
    expect(rows).toEqual([
      "flight-row-b",
      "flight-row-c",
      "flight-row-a",
      "flight-row-d",
    ]);
  });

  it("opens the flight details modal when the row is clicked", async () => {
    renderWith([enrichedFlight]);

    fireEvent.click(screen.getByTestId("flight-row-1"));

    expect(
      await screen.findByTestId("flight-details-edit-1"),
    ).toBeInTheDocument();
    expect(
      within(await screen.findByRole("dialog")).getByText("DL3"),
    ).toBeInTheDocument();
  });
});
