import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "../../test-utils";
import FlightDetailsPanel from "./FlightDetailsPanel";
import type { enhancedFlight } from "../types/enhancedFlight";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "uid-1" } }),
}));

const checkFlightStatusMock = vi.fn();
vi.mock("../utils/flightStatusService", () => ({
  checkFlightStatus: (...args: unknown[]) => checkFlightStatusMock(...args),
}));

const baseFlight: enhancedFlight = {
  id: "1",
  departure_date: "2026-09-20",
  departure_time: "14:30",
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  airline_iata: "QF",
  flight_number: "1",
  airline_icao: null,
  departure_coordinates: null,
  arrival_coordinates: null,
  distance_km: null,
  flight_time: null,
  departure_country: null,
  arrival_country: null,
  international: false,
  airline_name: null,
  airline_icon_path: null,
  flight_status: null,
  flight_status_checked_at: null,
};

describe("FlightDetailsPanel", () => {
  beforeEach(() => {
    checkFlightStatusMock.mockReset();
  });

  it("shows the check button and calls checkFlightStatus on click", async () => {
    checkFlightStatusMock.mockResolvedValue({ status: "Expected" });
    render(<FlightDetailsPanel flight={baseFlight} />);

    const button = screen.getByTestId("flight-status-check-1");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(checkFlightStatusMock).toHaveBeenCalledWith("uid-1", baseFlight),
    );
  });

  it("renders stored status data", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: { status: "Landed" },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Landed")).toBeInTheDocument();
  });

  it("disables the check button while the cooldown is in effect", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: { status: "Expected" },
          flight_status_checked_at: new Date().toISOString(),
        }}
      />,
    );

    const button = screen.getByTestId("flight-status-check-1");
    expect(button).toBeDisabled();
  });

  it("hides the check button when the flight has no flight number", () => {
    render(
      <FlightDetailsPanel flight={{ ...baseFlight, flight_number: null }} />,
    );
    expect(
      screen.queryByTestId("flight-status-check-1"),
    ).not.toBeInTheDocument();
  });
});
