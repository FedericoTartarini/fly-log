import { describe, expect, it } from "vitest";
import {
  buildAirlineOptions,
  buildAirportOptions,
} from "./flightFilterOptions";

const flights = [
  {
    id: "1",
    user_id: "u1",
    departure_date: "2025-01-01",
    departure_time: null,
    departure_airport_iata: "JFK",
    arrival_airport_iata: "LHR",
    airline_icao: null,
    airline_iata: "BA",
    flight_number: "117",
    created_at: "2025-01-01",
    departure_coordinates: [0, 0] as [number, number],
    arrival_coordinates: [0, 0] as [number, number],
    distance_km: 0,
    flight_time: 7,
    departure_country: "US",
    arrival_country: "UK",
    international: true,
    airline_name: "British Airways",
    airline_icon_path: "",
  },
  {
    id: "2",
    user_id: "u1",
    departure_date: "2025-02-01",
    departure_time: null,
    departure_airport_iata: "LHR",
    arrival_airport_iata: "CDG",
    airline_icao: null,
    airline_iata: "AF",
    flight_number: "22",
    created_at: "2025-02-01",
    departure_coordinates: [0, 0] as [number, number],
    arrival_coordinates: [0, 0] as [number, number],
    distance_km: 0,
    flight_time: 1,
    departure_country: "UK",
    arrival_country: "FR",
    international: true,
    airline_name: "Air France",
    airline_icon_path: "",
  },
];

describe("flightFilterOptions", () => {
  it("builds unique airline options sorted by label", () => {
    const out = buildAirlineOptions(flights);
    expect(out).toEqual([
      { value: "AF", label: "AF - Air France" },
      { value: "BA", label: "BA - British Airways" },
    ]);
  });

  it("builds airport options with full labels when reference data exists", () => {
    const airports = [
      {
        iata: "JFK",
        airport_name: "John F Kennedy Intl",
        city: "New York",
        country: "United States",
        lat: 0,
        lon: 0,
        iso_country: "US",
        iso_region: "US-NY",
        elevation: 0,
      },
      {
        iata: "LHR",
        airport_name: "Heathrow",
        city: "London",
        country: "United Kingdom",
        lat: 0,
        lon: 0,
        iso_country: "GB",
        iso_region: "GB-LND",
        elevation: 0,
      },
    ];

    const out = buildAirportOptions(flights, airports, "departure_airport_iata");
    expect(out).toEqual([
      { value: "JFK", label: "JFK - John F Kennedy Intl, New York, United States" },
      { value: "LHR", label: "LHR - Heathrow, London, United Kingdom" },
    ]);
  });

  it("falls back to IATA code when airport reference is missing", () => {
    const out = buildAirportOptions(flights, [], "arrival_airport_iata");
    expect(out).toEqual([
      { value: "CDG", label: "CDG" },
      { value: "LHR", label: "LHR" },
    ]);
  });
});
