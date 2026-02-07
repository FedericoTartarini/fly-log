// Mock useNavigate so the component doesn't require a Router during test render
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../test-utils/index.js";
import StatsSummary from "./StatsSummary";
import { IDS } from "../constants/MyClasses.ts";

import useFlightStore from "../store.ts";
import { enrichFlightData } from "../utils/flightService.ts";
import { makeRouterWrapper } from "../../test-utils/wrappers.jsx";

// Mock the store
vi.mock("../store", () => {
  return {
    default: vi.fn(),
  };
});

// Mock realistic flight data for the tests
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

const wrapper = makeRouterWrapper();

describe("StatsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display correct total values for all years", () => {
    useFlightStore.mockReturnValue({
      filteredFlights: enrichedFlights,
      allFlights: enrichedFlights,
    });
    render(<StatsSummary />, { wrapper });

    // Find element by ID and check its text content
    const totalFlightsElement = document.getElementById(
      IDS.STATS.TOTAL_FLIGHTS,
    );
    expect(totalFlightsElement).toHaveTextContent("4");

    const totalDistanceElement = document.getElementById(
      IDS.STATS.TOTAL_DISTANCE,
    );
    expect(totalDistanceElement).toHaveTextContent("10,671");

    const totalTimeElement = document.getElementById(IDS.STATS.TOTAL_TIME);
    expect(totalTimeElement).toHaveTextContent(".5");

    const airportsVisitedElement = document.getElementById(
      IDS.STATS.AIRPORTS_VISITED,
    );
    expect(airportsVisitedElement).toHaveTextContent("5");

    const airlinesFlownElement = document.getElementById(
      IDS.STATS.AIRLINES_FLOWN,
    );
    expect(airlinesFlownElement).toHaveTextContent("3");
  });
});
