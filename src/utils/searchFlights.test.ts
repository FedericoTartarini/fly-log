import { describe, it, expect, vi } from "vitest";

vi.mock("./airportUtils", () => ({
  getAirportCity: (iata: string) =>
    ({ SYD: "Sydney", SIN: "Singapore", ZRH: "Zürich" })[iata] ?? iata,
}));

import { searchFlights } from "./searchFlights";
import type { enhancedFlight } from "../types/enhancedFlight";

const flights = [
  {
    id: "qf",
    departure_airport_iata: "SYD",
    arrival_airport_iata: "SIN",
    airline_iata: "QF",
    airline_name: "Qantas",
    flight_number: "81",
  },
  {
    id: "lx",
    departure_airport_iata: "ZRH",
    arrival_airport_iata: "SIN",
    airline_iata: "LX",
    airline_name: "Swiss",
    flight_number: null,
  },
] as unknown as enhancedFlight[];

const ids = (query: string) => searchFlights(flights, query).map((f) => f.id);

describe("searchFlights", () => {
  it("keeps every flight for an empty or blank query", () => {
    expect(ids("")).toEqual(["qf", "lx"]);
    expect(ids("   ")).toEqual(["qf", "lx"]);
  });

  it("matches airport codes and cities, ignoring case", () => {
    expect(ids("syd")).toEqual(["qf"]);
    expect(ids("SINGAPORE")).toEqual(["qf", "lx"]);
  });

  it("matches cities without their accents", () => {
    expect(ids("zurich")).toEqual(["lx"]);
  });

  it("matches airline names and codes", () => {
    expect(ids("qantas")).toEqual(["qf"]);
    expect(ids("swiss")).toEqual(["lx"]);
  });

  it("matches a flight number with or without the space", () => {
    expect(ids("QF81")).toEqual(["qf"]);
    expect(ids("qf 81")).toEqual(["qf"]);
    expect(ids("QF82")).toEqual([]);
  });
});
