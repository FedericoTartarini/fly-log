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
import { makeRouterWrapper } from "../../test-utils/wrappers.jsx";

// Mock the store
vi.mock("../store", () => {
  return {
    default: vi.fn(),
  };
});

// Mock enriched flight data for the tests
const enrichedFlights = [
  {
    id: 1,
    departure_date: "2024-03-10",
    departure_airport_iata: "SFO",
    arrival_airport_iata: "SEA",
    airline_name: "Delta",
    flight_number: 3,
    departure_country: "US",
    arrival_country: "US",
    departure_coordinates: [37.62, -122.38],
    arrival_coordinates: [47.45, -122.31],
    distance_km: 1091,
    flight_time: 1.2,
  },
  {
    id: 2,
    departure_date: "2023-05-01",
    departure_airport_iata: "JFK",
    arrival_airport_iata: "LAX",
    airline_name: "American",
    flight_number: 5,
    departure_country: "US",
    arrival_country: "US",
    departure_coordinates: [40.64, -73.78],
    arrival_coordinates: [33.94, -118.4],
    distance_km: 3974,
    flight_time: 4.4,
  },
  {
    id: 3,
    departure_date: "2022-08-15",
    departure_airport_iata: "LAX",
    arrival_airport_iata: "ORD",
    airline_name: "United",
    flight_number: 7,
    departure_country: "US",
    arrival_country: "US",
    departure_coordinates: [33.94, -118.4],
    arrival_coordinates: [41.97, -87.9],
    distance_km: 2805,
    flight_time: 3.1,
  },
  {
    id: 4,
    departure_date: "2025-01-20",
    departure_airport_iata: "LAX",
    arrival_airport_iata: "ORD",
    airline_name: "United",
    flight_number: 9,
    departure_country: "US",
    arrival_country: "US",
    departure_coordinates: [33.94, -118.4],
    arrival_coordinates: [41.97, -87.9],
    distance_km: 2801,
    flight_time: 3.3,
  },
];

const wrapper = makeRouterWrapper();

describe("StatsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display correct total values for all years", () => {
    useFlightStore.mockImplementation((selector) =>
      selector({
        filteredFlights: enrichedFlights,
        allFlights: enrichedFlights,
      }),
    );
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
