import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../test-utils/index.js";

// Mock firebaseClient
vi.mock("../firebaseClient", () => ({
  addFlightsForUser: vi
    .fn()
    .mockResolvedValue({ successCount: 0, errorCount: 0, ids: [] }),
  addFlightForUser: vi.fn().mockResolvedValue(undefined),
  signInWithEmail: vi.fn(),
}));

// A signed-in user, so an upload gets as far as reading the file.
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { uid: "test-uid" } }),
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
      screen.getByRole("heading", { name: /Import a spreadsheet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Import flights/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Choose a CSV file/i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/Choose a CSV file/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Import flights/i }));

    await waitFor(() => {
      expect(screen.getByText(/Missing fields/i)).toBeInTheDocument();
    });
  });

  it("takes a file dropped on the picker", () => {
    render(<FlightCsvUpload />);
    const button = screen.getByRole("button", { name: /Import flights/i });
    expect(button).toBeDisabled();

    const file = new File(["x"], "trips.csv", { type: "text/csv" });
    fireEvent.drop(screen.getByText(/or drop it here/i), {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("trips.csv")).toBeInTheDocument();
    expect(button).not.toBeDisabled();
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

  it("validateCsvData accepts optional arrival columns and checks their format", () => {
    const row = {
      departure_date: "2024-03-10",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "SIN",
      airline_iata: "QF",
    };
    expect(validateCsvData([row])).toEqual([]);
    expect(
      validateCsvData([
        { ...row, arrival_date: "2024-03-11", arrival_time: "05:40" },
      ]),
    ).toEqual([]);

    const errors = validateCsvData([
      { ...row, arrival_date: "11/03/2024", arrival_time: "5pm" },
    ]);
    expect(errors.some((e) => e.includes("arrival_date"))).toBe(true);
    expect(errors.some((e) => e.includes("arrival_time"))).toBe(true);
  });

  it("validateCsvData accepts a known cabin_class and rejects anything else", () => {
    const row = {
      departure_date: "2024-03-10",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "SIN",
      airline_iata: "QF",
    };
    expect(validateCsvData([{ ...row, cabin_class: "business" }])).toEqual([]);
    expect(
      validateCsvData([{ ...row, cabin_class: "Upper" }]).some((e) =>
        e.includes("cabin_class"),
      ),
    ).toBe(true);
  });
});
