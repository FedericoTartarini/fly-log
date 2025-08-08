import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MantineProvider } from "@mantine/core";

// Mock window.matchMedia for Mantine
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Mock supabaseClient
vi.mock("../supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

// Mock notifications
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock PapaParse
vi.mock("papaparse", () => ({
  __esModule: true,
  default: {
    parse: vi.fn(),
  },
}));

import FlightCsvUpload, { validateCsvData } from "./FlightCsvUpload";
import { supabaseClient } from "../supabaseClient";
import { notifications } from "@mantine/notifications";
import Papa from "papaparse";

const renderWithProvider = (ui) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("FlightCsvUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input and button", () => {
    renderWithProvider(<FlightCsvUpload />);
    expect(
      screen.getByText(/Upload Flight Data from CSV/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Upload Flights/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Flight data CSV/i)).toBeInTheDocument();
  });

  it("shows validation error for invalid CSV data", async () => {
    Papa.parse.mockImplementation((file, opts) => {
      opts.complete({
        data: [
          { departure_date: "2024-01-01", departure_airport_iata: "JFK" }, // missing required fields
        ],
      });
    });

    renderWithProvider(<FlightCsvUpload />);
    const file = new File(["invalid"], "test.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText(/Flight data CSV/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upload Flights/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Your CSV must include these columns:/i),
      ).toBeInTheDocument();
    });
  });

  it("validateCsvData returns errors for missing/invalid fields", () => {
    const errors = validateCsvData([
      { departure_date: "2024-01-01", departure_airport_iata: "JFK" },
      {
        departure_date: "2024-01-01",
        departure_airport_iata: "JFK",
        arrival_airport_iata: "LAX",
        airline_iata: "A",
        flight_number: "AA@123",
      },
    ]);
    expect(errors.some((e) => e.includes("Missing fields"))).toBe(true);
    expect(errors.some((e) => e.includes("Invalid airline_iata"))).toBe(true);
    expect(errors.some((e) => e.includes("Invalid flight_number"))).toBe(true);
  });
});
