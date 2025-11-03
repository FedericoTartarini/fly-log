import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../test-utils/index.js";

// Mock firebaseClient
vi.mock("../firebaseClient", () => ({
  addFlightsForUser: vi.fn().mockResolvedValue(undefined),
  addFlightForUser: vi.fn().mockResolvedValue(undefined),
  signInWithEmail: vi.fn(),
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
import Papa from "papaparse";

describe("FlightCsvUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input and button", () => {
    render(<FlightCsvUpload />);
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

    render(<FlightCsvUpload />);
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
    ]);
    expect(errors.some((e) => e.includes("Missing fields"))).toBe(true);
    expect(errors.some((e) => e.includes("airline_iata"))).toBe(true);
  });

  it("validateCsvData returns errors for date incorrectly formatted", () => {
    const errors = validateCsvData([
      { departure_date: "01-01-2024", departure_airport_iata: "JFK" },
    ]);
    expect(errors.some((e) => e.includes("Missing fields"))).toBe(true);
    expect(errors.some((e) => e.includes("airline_iata"))).toBe(true);
  });
});
