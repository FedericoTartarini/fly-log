import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../test-utils/render";
import StatsSummary from "./StatsSummary";
import { Ids } from "../constants/MyClasses.js";

import { MemoryRouter } from "react-router-dom";
import useFlightStore from "../store";
import { MantineProvider } from "@mantine/core";
import { enrichFlightData } from "../utils/flightService.js";

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
  {
    id: 2,
    departure_date: "2023-05-01",
    departure_airport_iata: "JFK",
    arrival_airport_iata: "LAX",
    airline_iata: "AA",
    flight_number: 5,
  },
  {
    id: 3,
    departure_date: "2022-08-15",
    departure_airport_iata: "LAX",
    arrival_airport_iata: "ORD",
    airline_iata: "UA",
    flight_number: 7,
  },
  {
    id: 4,
    departure_date: "2025-01-20",
    departure_airport_iata: "LAX",
    arrival_airport_iata: "ORD",
    airline_iata: "UA",
    flight_number: 9,
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

describe("StatsSummary", () => {
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

  it("should display correct total values for all years", () => {
    renderWithProvider(<StatsSummary />);

    // Find element by ID and check its text content
    const totalFlightsElement = document.getElementById(
      Ids.STATS.TOTAL_FLIGHTS,
    );
    expect(totalFlightsElement).toHaveTextContent("4");

    const totalDistanceElement = document.getElementById(
      Ids.STATS.TOTAL_DISTANCE,
    );
    expect(totalDistanceElement).toHaveTextContent("10,671");

    const totalTimeElement = document.getElementById(Ids.STATS.TOTAL_TIME);
    expect(totalTimeElement).toHaveTextContent(".5");

    const airportsVisitedElement = document.getElementById(
      Ids.STATS.AIRPORTS_VISITED,
    );
    expect(airportsVisitedElement).toHaveTextContent("5");

    const airlinesFlownElement = document.getElementById(
      Ids.STATS.AIRLINES_FLOWN,
    );
    expect(airlinesFlownElement).toHaveTextContent("1");
  });
});
