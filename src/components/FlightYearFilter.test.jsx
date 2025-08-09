import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MantineProvider } from "@mantine/core";

import FlightYearFilter from "./FlightYearFilter";
import useFlightStore from "../store.ts";

// Mock the Zustand store BEFORE importing the component
const mockSetSelectedYear = vi.fn();
const mockFlights = [
  {
    id: 1,
    departure_date: "2023-05-01",
    departure_time: "10:00",
    departure_airport_iata: "JFK",
    arrival_airport_iata: "LAX",
    airline_iata: "AA",
  },
  {
    id: 2,
    departure_date: "2022-08-15",
    departure_time: "14:30",
    departure_airport_iata: "LAX",
    arrival_airport_iata: "ORD",
    airline_iata: "UA",
  },
];

vi.mock("../store", () => ({
  __esModule: true,
  default: vi.fn(() => ({
    selectedYear: "all",
    setSelectedYear: mockSetSelectedYear,
    flights: mockFlights,
    filteredFlights: mockFlights,
    allFlights: mockFlights,
    isLoading: false,
    error: null,
  })),
}));

const renderWithProvider = (component) =>
  render(<MantineProvider>{component}</MantineProvider>);

describe("FlightYearFilter", () => {
  beforeEach(() => {
    mockSetSelectedYear.mockClear();
    useFlightStore.mockImplementation(() => ({
      selectedYear: "all",
      setSelectedYear: mockSetSelectedYear,
      flights: mockFlights,
      filteredFlights: mockFlights,
      allFlights: mockFlights,
      isLoading: false,
      error: null,
    }));
  });

  it("renders with correct default options", () => {
    renderWithProvider(<FlightYearFilter />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    // Check that the default value is 'all'
    expect(select.value).toBe("all");
    // Check that the options exist
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("All Past Flights");
    expect(options[1]).toHaveTextContent("Upcoming Flights");
    expect(options[2]).toHaveTextContent("2023");
    expect(options[3]).toHaveTextContent("2022");
  });

  it("displays years in descending order from past flights only", () => {
    renderWithProvider(<FlightYearFilter />);
    const options = screen.getAllByRole("option");
    expect(options[2]).toHaveTextContent("2023");
    expect(options[3]).toHaveTextContent("2022");
  });

  it("calls setSelectedYear when selection changes", () => {
    renderWithProvider(<FlightYearFilter />);
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
    renderWithProvider(<FlightYearFilter />);
    const select = screen.getByRole("combobox");
    expect(select.value).toBe("2023");
  });
});
