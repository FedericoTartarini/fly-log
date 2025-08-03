import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MantineProvider } from "@mantine/core";
import FlightYearFilter from "./FlightYearFilter";
import useFlightStore from "../store";

// Mock the flight data with proper field names matching the updated component
vi.mock("../../python/flights_with_coordinates.json", () => ({
  default: [
    { date: "2023-01-15" },
    { date: "2023-05-20" },
    { date: "2022-11-10" },
    { date: "2024-12-25" }, // Future flight
  ],
}));

// Mock the Zustand store
vi.mock("../store", () => ({
  default: vi.fn(),
}));

describe("FlightYearFilter", () => {
  const mockSetSelectedYear = vi.fn();

  const renderWithProvider = (component) => {
    return render(<MantineProvider>{component}</MantineProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current date to ensure consistent test results
    vi.setSystemTime(new Date("2024-01-01"));
  });

  it("renders with correct default options", () => {
    useFlightStore.mockReturnValue({
      selectedYear: "all",
      setSelectedYear: mockSetSelectedYear,
    });

    renderWithProvider(<FlightYearFilter />);

    const select = screen.getByDisplayValue("All Stats");
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute("id", "flight-year-filter");
  });

  it("displays years in descending order from past flights only", () => {
    useFlightStore.mockReturnValue({
      selectedYear: "all",
      setSelectedYear: mockSetSelectedYear,
    });

    renderWithProvider(<FlightYearFilter />);

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");

    // Should have: All Stats, Upcoming Flights, 2023, 2022
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("All Stats");
    expect(options[1]).toHaveTextContent("Upcoming Flights");
    expect(options[2]).toHaveTextContent("2023");
    expect(options[3]).toHaveTextContent("2022");
  });

  it("calls setSelectedYear when selection changes", () => {
    useFlightStore.mockReturnValue({
      selectedYear: "all",
      setSelectedYear: mockSetSelectedYear,
    });

    renderWithProvider(<FlightYearFilter />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "2023" } });

    expect(mockSetSelectedYear).toHaveBeenCalledWith("2023");
  });

  it("reflects the current selected year from store", () => {
    useFlightStore.mockReturnValue({
      selectedYear: "2023",
      setSelectedYear: mockSetSelectedYear,
    });

    renderWithProvider(<FlightYearFilter />);

    const select = screen.getByDisplayValue("2023");
    expect(select).toBeInTheDocument();
  });
});
