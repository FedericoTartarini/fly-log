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
import { DEFAULT_FILTERS } from "../utils/activeFilters";

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
  filters: typeof DEFAULT_FILTERS;
  clearFilters: () => void;
};

const renderWith = (
  filteredFlights: enhancedFlight[],
  { filters = DEFAULT_FILTERS, clearFilters = vi.fn() } = {},
) => {
  const mockedUseFlightStore = useFlightStore as unknown as Mock;
  mockedUseFlightStore.mockImplementation(
    (selector: (state: StoreShape) => unknown) =>
      selector({ filteredFlights, filters, clearFilters }),
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

  describe("search", () => {
    const sydLhr = {
      ...enrichedFlight,
      id: "a",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "LHR",
      departure_date: "2024-03-10",
    };
    const sydMel = {
      ...enrichedFlight,
      id: "b",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "MEL",
      airline_iata: "QF",
      flight_number: "409",
      departure_date: "2023-05-01",
      distance_km: 705,
    };
    const search = () => screen.getByRole("searchbox");

    it("narrows the rows and year groups, and announces the count", () => {
      renderWith([sydLhr, sydMel]);
      expect(search()).toHaveAttribute(
        "placeholder",
        "City, airline, flight no.",
      );

      fireEvent.change(search(), { target: { value: "QF 409" } });

      expect(screen.getByTestId("flight-row-b")).toBeInTheDocument();
      expect(screen.queryByTestId("flight-row-a")).toBeNull();
      expect(
        screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
      ).toEqual(["20231 flight · 705 km"]);
      expect(screen.getByText("1 flight matches “QF 409”")).toHaveAttribute(
        "aria-live",
        "polite",
      );
    });

    it("offers to clear the search when nothing matches", () => {
      renderWith([sydLhr]);
      fireEvent.change(search(), { target: { value: "A&B" } });

      expect(screen.getByText("No flights match “A&B”")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Search all flights" }),
      ).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
      expect(search()).toHaveValue("");
      // The button is gone, so focus goes back to the search box.
      expect(search()).toHaveFocus();
      expect(screen.getByTestId("flight-row-a")).toBeInTheDocument();
    });

    it("searches only the filtered flights, and can widen to all of them", () => {
      const clearFilters = vi.fn();
      renderWith([sydLhr, sydMel], {
        filters: { ...DEFAULT_FILTERS, departureAirport: "SYD" },
        clearFilters,
      });
      expect(search()).toHaveAttribute("placeholder", "Search these 2 flights");
      expect(search()).toHaveAccessibleName("Search the filtered flights");

      fireEvent.change(search(), { target: { value: "syd" } });
      expect(
        screen.getByText("2 flights match “syd” in your filtered flights"),
      ).toBeInTheDocument();

      fireEvent.change(search(), { target: { value: "perth" } });
      expect(
        screen.getByText(/Search only looks inside the flights your filters/),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Search all flights" }),
      );
      expect(clearFilters).toHaveBeenCalledOnce();
      expect(search()).toHaveFocus();
      expect(search()).toHaveValue("perth");
    });
  });

  describe("sort", () => {
    const flights = [
      {
        ...enrichedFlight,
        id: "short",
        departure_date: "2024-03-10",
        distance_km: 163,
      },
      {
        ...enrichedFlight,
        id: "long",
        departure_date: "2023-05-01",
        distance_km: 13581,
      },
    ];
    const sortBy = (label: string) =>
      fireEvent.change(screen.getByRole("combobox", { name: "Sort flights" }), {
        target: { value: label },
      });
    const rowIds = () =>
      screen
        .getAllByTestId(/^flight-row-/)
        .map((row) => row.getAttribute("data-testid"));
    const headings = () =>
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

    it("runs the years backwards for Oldest", () => {
      renderWith(flights);
      expect(headings()).toEqual([
        "20241 flight · 163 km",
        "20231 flight · 13,581 km",
      ]);

      sortBy("oldest");
      expect(headings()).toEqual([
        "20231 flight · 13,581 km",
        "20241 flight · 163 km",
      ]);
    });

    it("shows one list with distances for Longest and Shortest", () => {
      renderWith(flights);

      sortBy("longest");
      expect(headings()).toEqual(["Longest first2 flights · 13,744 km"]);
      expect(rowIds()).toEqual(["flight-row-long", "flight-row-short"]);
      const row = screen.getByTestId("flight-row-long");
      expect(row).toHaveTextContent("13,581 km");
      expect(row).toHaveTextContent("1 May 2023");

      sortBy("shortest");
      expect(headings()).toEqual(["Shortest first2 flights · 13,744 km"]);
      expect(rowIds()).toEqual(["flight-row-short", "flight-row-long"]);
    });

    it("sorts the search results", () => {
      renderWith([
        ...flights,
        { ...flights[0], id: "other", departure_airport_iata: "LHR" },
      ]);
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "SFO" },
      });
      sortBy("longest");
      expect(rowIds()).toEqual(["flight-row-long", "flight-row-short"]);
    });
  });
});
