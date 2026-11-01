import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "../../test-utils/index.js";
import FlightFilters from "./FlightFilters";
import useFlightStore from "../store";
import { DEFAULT_FILTERS } from "../utils/activeFilters";

vi.mock("../utils/referenceData", async () => {
  const actual = await vi.importActual("../utils/referenceData");
  return {
    ...actual,
    loadAirportsInfo: vi.fn().mockResolvedValue([
      {
        iata: "JFK",
        airport_name: "John F. Kennedy International Airport",
        city: "New York",
        country: "United States",
        lat: 40.6413,
        lon: -73.7781,
        iso_country: "US",
        iso_region: "US-NY",
        elevation: 13,
      },
      {
        iata: "LHR",
        airport_name: "Heathrow Airport",
        city: "London",
        country: "United Kingdom",
        lat: 51.47,
        lon: -0.4543,
        iso_country: "GB",
        iso_region: "GB-LND",
        elevation: 83,
      },
      {
        iata: "LAX",
        airport_name: "Los Angeles International Airport",
        city: "Los Angeles",
        country: "United States",
        lat: 33.9416,
        lon: -118.4085,
        iso_country: "US",
        iso_region: "US-CA",
        elevation: 125,
      },
      {
        iata: "NRT",
        airport_name: "Narita International Airport",
        city: "Narita",
        country: "Japan",
        lat: 35.772,
        lon: 140.3929,
        iso_country: "JP",
        iso_region: "JP-12",
        elevation: 141,
      },
      {
        iata: "BLQ",
        airport_name: "Bologna Guglielmo Marconi Airport",
        city: "Bologna",
        country: "Italy",
        lat: 44.5354,
        lon: 11.2887,
        iso_country: "IT",
        iso_region: "IT-BO",
        elevation: 123,
      },
      {
        iata: "FCO",
        airport_name: "Leonardo da Vinci International Airport",
        city: "Rome",
        country: "Italy",
        lat: 41.8003,
        lon: 12.2389,
        iso_country: "IT",
        iso_region: "IT-RM",
        elevation: 13,
      },
    ]),
  };
});

const sampleFlights = [
  {
    id: "f1",
    departure_date: "2025-01-01",
    departure_airport_iata: "JFK",
    arrival_airport_iata: "LHR",
    airline_iata: "AA",
    airline_name: "American Airlines",
    flight_time: 7.5,
  },
  {
    id: "f2",
    departure_date: "2025-02-01",
    departure_airport_iata: "LAX",
    arrival_airport_iata: "NRT",
    airline_iata: "JL",
    airline_name: "Japan Airlines",
    flight_time: 11.25,
  },
  {
    id: "f3",
    departure_date: "2025-03-01",
    departure_airport_iata: "BLQ",
    arrival_airport_iata: "FCO",
    airline_iata: "AZ",
    airline_name: "ITA Airways",
    flight_time: 1,
  },
];

const setStore = (filters = {}, flights = sampleFlights) =>
  useFlightStore.setState({
    allFlights: flights,
    filteredFlights: flights,
    filters: { ...DEFAULT_FILTERS, ...filters },
  });

const openPanel = async () => {
  render(<FlightFilters isPhone />);
  await userEvent.click(
    screen.getByRole("button", { name: /^Filter flights/ }),
  );
  return screen.findByRole("dialog");
};

describe("FlightFilters", () => {
  beforeEach(() => setStore());

  it("opens the panel with the live count of flights", async () => {
    await openPanel();

    expect(
      screen.getByRole("button", { name: "Show 3 flights" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
  });

  it("closes when the sheet's header is swiped down", async () => {
    const dialog = await openPanel();
    const header = within(dialog).getByRole("heading", {
      name: "Filter flights",
    }).parentElement;
    // The scroll lock also listens to touches, and reads both lists.
    const swipe = (from, to) => {
      const at = (clientY) => [{ clientX: 0, clientY }];
      fireEvent.touchStart(header, {
        touches: at(from),
        changedTouches: at(from),
      });
      fireEvent.touchEnd(header, { touches: [], changedTouches: at(to) });
    };

    swipe(100, 120);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    swipe(100, 200);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("names both ends of the flight length slider", async () => {
    await openPanel();

    expect(
      screen.getByRole("slider", { name: "Shortest flight, in hours" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "Longest flight, in hours" }),
    ).toBeInTheDocument();
  });

  it("says on the button how many filters are on", () => {
    setStore({ airline: "AA", minDuration: 1 });
    render(<FlightFilters isPhone={false} />);

    expect(
      screen.getByRole("button", { name: "Filter flights, 2 filters on" }),
    ).toBeInTheDocument();
  });

  it("clears every filter with Clear all", async () => {
    setStore({ when: "past", airline: "AA", minDuration: 1 });
    await openPanel();

    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));

    const state = useFlightStore.getState();
    expect(state.filters).toEqual(DEFAULT_FILTERS);
    expect(state.filteredFlights).toHaveLength(sampleFlights.length);
  });

  it("locks both year fields when every flight is in one year", async () => {
    await openPanel();

    expect(
      screen.getByText("All 3 of your flights are in 2025."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "From year" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "To year" })).toBeDisabled();
  });

  it("offers the years of the chosen When", async () => {
    setStore({}, [
      ...sampleFlights,
      { ...sampleFlights[0], id: "f4", departure_date: "2023-06-01" },
    ]);
    await openPanel();

    expect(
      screen.getByText("Your flights run from 2023 to 2025."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "From year" })).toBeEnabled();

    await userEvent.click(screen.getByRole("radio", { name: "Upcoming" }));
    expect(
      screen.getByText("You have no upcoming flights."),
    ).toBeInTheDocument();
  });

  it("auto-clears invalid arrival when other active filters make it impossible", async () => {
    setStore({ airline: "AZ", departureAirport: "BLQ", arrivalAirport: "LHR" });

    render(<FlightFilters isPhone />);

    await waitFor(() => {
      const state = useFlightStore.getState();
      expect(state.filters.arrivalAirport).toBeNull();
      expect(state.filters.airline).toBe("AZ");
      expect(state.filters.departureAirport).toBe("BLQ");
    });
  });
});
