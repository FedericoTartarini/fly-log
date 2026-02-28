import { describe, expect, it } from "vitest";
import { filterFlightsForFacetOptions } from "./flightFilterFacets";
import { YEAR_FILTER } from "../constants/filters";

const getISODateOffset = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const flights = [
  {
    id: "1",
    departure_date: getISODateOffset(30),
    departure_airport_iata: "JFK",
    arrival_airport_iata: "LHR",
    airline_iata: "BA",
    airline_icao: null,
    airline_name: "British Airways",
    airline_icon_path: null,
    flight_time: 7,
    departure_coordinates: [0, 0] as [number, number],
    arrival_coordinates: [0, 0] as [number, number],
    distance_km: 0,
    departure_country: "US",
    arrival_country: "GB",
    international: true,
  },
  {
    id: "2",
    departure_date: getISODateOffset(-30),
    departure_airport_iata: "LAX",
    arrival_airport_iata: "NRT",
    airline_iata: "JL",
    airline_icao: null,
    airline_name: "Japan Airlines",
    airline_icon_path: null,
    flight_time: 11,
    departure_coordinates: [0, 0] as [number, number],
    arrival_coordinates: [0, 0] as [number, number],
    distance_km: 0,
    departure_country: "US",
    arrival_country: "JP",
    international: true,
  },
];

describe("filterFlightsForFacetOptions year presets", () => {
  it("filters for upcoming flights", () => {
    const out = filterFlightsForFacetOptions(
      flights,
      YEAR_FILTER.UPCOMING,
      {
        airline: null,
        departureAirport: null,
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      },
      "airline",
    );

    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("1");
  });

  it("filters for past flights", () => {
    const out = filterFlightsForFacetOptions(
      flights,
      YEAR_FILTER.PAST,
      {
        airline: null,
        departureAirport: null,
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      },
      "airline",
    );

    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("2");
  });
});
