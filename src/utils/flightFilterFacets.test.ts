import { describe, expect, it } from "vitest";
import { filterFlightsForFacetOptions } from "./flightFilterFacets";

const flights = [
  {
    id: "1",
    user_id: "u1",
    departure_date: "2025-01-10",
    departure_time: null,
    departure_airport_iata: "BLQ",
    arrival_airport_iata: "LHR",
    airline_icao: null,
    airline_iata: "BA",
    flight_number: "541",
    created_at: "2025-01-10",
    departure_coordinates: [0, 0] as [number, number],
    arrival_coordinates: [0, 0] as [number, number],
    distance_km: 0,
    flight_time: 2,
    departure_country: "IT",
    arrival_country: "UK",
    international: true,
    airline_name: "British Airways",
    airline_icon_path: "",
  },
  {
    id: "2",
    user_id: "u1",
    departure_date: "2025-02-11",
    departure_time: null,
    departure_airport_iata: "BLQ",
    arrival_airport_iata: "FCO",
    airline_icao: null,
    airline_iata: "AZ",
    flight_number: "1321",
    created_at: "2025-02-11",
    departure_coordinates: [0, 0] as [number, number],
    arrival_coordinates: [0, 0] as [number, number],
    distance_km: 0,
    flight_time: 1,
    departure_country: "IT",
    arrival_country: "IT",
    international: false,
    airline_name: "ITA Airways",
    airline_icon_path: "",
  },
  {
    id: "3",
    user_id: "u1",
    departure_date: "2025-03-12",
    departure_time: null,
    departure_airport_iata: "MXP",
    arrival_airport_iata: "JFK",
    airline_icao: null,
    airline_iata: "DL",
    flight_number: "185",
    created_at: "2025-03-12",
    departure_coordinates: [0, 0] as [number, number],
    arrival_coordinates: [0, 0] as [number, number],
    distance_km: 0,
    flight_time: 9,
    departure_country: "IT",
    arrival_country: "US",
    international: true,
    airline_name: "Delta",
    airline_icon_path: "",
  },
];

describe("filterFlightsForFacetOptions", () => {
  it("updates airline facet based on selected departure airport", () => {
    const out = filterFlightsForFacetOptions(
      flights,
      "all",
      {
        airline: null,
        departureAirport: "BLQ",
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      },
      "airline",
    );

    expect(out.map((f) => f.airline_iata).sort()).toEqual(["AZ", "BA"]);
  });

  it("updates arrival facet based on selected departure and airline", () => {
    const out = filterFlightsForFacetOptions(
      flights,
      "all",
      {
        airline: "BA",
        departureAirport: "BLQ",
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      },
      "arrivalAirport",
    );

    expect(out).toHaveLength(1);
    expect(out[0].arrival_airport_iata).toBe("LHR");
  });

  it("applies duration constraints when computing facet options", () => {
    const out = filterFlightsForFacetOptions(
      flights,
      "all",
      {
        airline: null,
        departureAirport: "BLQ",
        arrivalAirport: null,
        minDuration: 1.5,
        maxDuration: 3,
      },
      "airline",
    );

    expect(out).toHaveLength(1);
    expect(out[0].airline_iata).toBe("BA");
  });
});
