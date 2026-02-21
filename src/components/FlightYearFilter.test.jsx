import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as sharedRender } from "../../test-utils/index.js";
import { YEAR_FILTER } from "../constants/filters.ts";

// Prepare mocks and mock the store before importing the component
const mockSetSelectedYear = vi.fn();
const mockFlights = [
  {
    id: 1,
    // use ISO date strings so parsing is deterministic in tests
    departure_date: "2023-05-01T10:54:31Z",
    departure_time: "10:00",
    departure_airport_iata: "JFK",
    arrival_airport_iata: "LAX",
    airline_iata: "AA",
  },
  {
    id: 2,
    departure_date: "2022-08-15T14:30:00Z",
    departure_time: "14:30",
    departure_airport_iata: "LAX",
    arrival_airport_iata: "ORD",
    airline_iata: "UA",
  },
];

vi.mock("../store.ts", () => ({
  __esModule: true,
  default: vi.fn(() => ({
    selectedYear: YEAR_FILTER.ALL,
    setSelectedYear: mockSetSelectedYear,
    flights: mockFlights,
    filteredFlights: mockFlights,
    allFlights: mockFlights,
    isLoading: false,
    error: null,
  })),
}));

import FlightYearFilter from "./FlightYearFilter";
import useFlightStore from "../store.ts";

describe("FlightYearFilter", () => {
  beforeEach(() => {
    mockSetSelectedYear.mockClear();
    useFlightStore.mockImplementation(() => ({
      selectedYear: YEAR_FILTER.ALL,
      setSelectedYear: mockSetSelectedYear,
      flights: mockFlights,
      filteredFlights: mockFlights,
      allFlights: mockFlights,
      isLoading: false,
      error: null,
    }));
  });

  it("renders with correct default options", () => {
    sharedRender(<FlightYearFilter />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    // Check that the default value is 'all'
    expect(select.value).toBe(YEAR_FILTER.ALL);
    // Check that the options exist and have expected values (translations may vary)
    const options = screen.getAllByRole("option");
    // First three are the special filters: values should be 'all', 'upcoming', 'past'
    expect(options[0].value).toBe(YEAR_FILTER.ALL);
    expect(options[1].value).toBe(YEAR_FILTER.UPCOMING);
    expect(options[2].value).toBe(YEAR_FILTER.PAST);
    // Next options are years; ensure they display the expected year strings
    expect(
      options.some((o) => o.textContent && o.textContent.includes("2023")),
    ).toBe(true);
    expect(
      options.some((o) => o.textContent && o.textContent.includes("2022")),
    ).toBe(true);
  });

  it("displays years in descending order from past flights only", () => {
    sharedRender(<FlightYearFilter />);
    const options = screen.getAllByRole("option");
    // The year options should appear after the three filter options and be in descending order
    expect(options[3].textContent).toContain("2023");
    expect(options[4].textContent).toContain("2022");
  });

  it("calls setSelectedYear when selection changes", () => {
    sharedRender(<FlightYearFilter />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "2023" } });
    expect(mockSetSelectedYear).toHaveBeenCalledWith("2023");
  });

  it("reflects the current selected year from store", () => {
    useFlightStore.mockImplementation(() => ({
      selectedYear: "2023",
      setSelectedYear: mockSetSelectedYear,
      flights: mockFlights,
      filteredFlights: mockFlights,
      allFlights: mockFlights,
      isLoading: false,
      error: null,
    }));
    sharedRender(<FlightYearFilter />);
    const select = screen.getByRole("combobox");
    expect(select.value).toBe("2023");
  });
});
