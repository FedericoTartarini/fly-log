import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "../../test-utils";
import FlightDetailsModal from "./FlightDetailsModal";
import type { enhancedFlight } from "../types/enhancedFlight";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "uid-1" } }),
}));

const checkFlightStatusMock = vi.fn();
// FlightStatusError is re-exported unmocked: the component uses it in an
// `instanceof` check to pick the user-facing message, so the class the test
// throws must be the same one the component imports.
vi.mock("../utils/flightStatusService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../utils/flightStatusService")>();
  return {
    FlightStatusError: actual.FlightStatusError,
    checkFlightStatus: (...args: unknown[]) => checkFlightStatusMock(...args),
  };
});

const deleteFlightForUserMock = vi.fn();
vi.mock("../utils/flightService", () => ({
  deleteFlightForUser: (...args: unknown[]) =>
    deleteFlightForUserMock(...args),
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

describe("FlightDetailsModal", () => {
  beforeEach(() => {
    checkFlightStatusMock.mockReset();
    deleteFlightForUserMock.mockReset();
  });

  it("renders the flight's route and flight number", () => {
    render(<FlightDetailsModal flight={baseFlight} onEdit={vi.fn()} />);
    expect(screen.getByText("SYD → SIN")).toBeInTheDocument();
    expect(screen.getByText("QF1")).toBeInTheDocument();
  });

  it("calls onEdit with the flight when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(<FlightDetailsModal flight={baseFlight} onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId("flight-details-edit-1"));
    expect(onEdit).toHaveBeenCalledWith(baseFlight);
  });

  it("checks flight status when Check status is clicked", async () => {
    checkFlightStatusMock.mockResolvedValue({ status: "Expected" });
    render(<FlightDetailsModal flight={baseFlight} onEdit={vi.fn()} />);

    const button = screen.getByTestId("flight-status-check-1");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(checkFlightStatusMock).toHaveBeenCalledWith("uid-1", baseFlight),
    );
  });

  it("disables the check button while the cooldown is in effect", () => {
    render(
      <FlightDetailsModal
        flight={{
          ...baseFlight,
          flight_status: { status: "Expected" },
          flight_status_checked_at: new Date().toISOString(),
        }}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("flight-status-check-1")).toBeDisabled();
  });

  it("shows a message instead of the check button when there's no flight number", () => {
    render(
      <FlightDetailsModal
        flight={{ ...baseFlight, flight_number: null }}
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("flight-status-check-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "This flight has no flight number, so status can't be looked up.",
      ),
    ).toBeInTheDocument();
  });

  it("deletes the flight after confirming", async () => {
    deleteFlightForUserMock.mockResolvedValue(undefined);
    render(<FlightDetailsModal flight={baseFlight} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("flight-details-delete-1"));
    fireEvent.click(await screen.findByTestId("flight-delete-confirm-1"));

    await waitFor(() =>
      expect(deleteFlightForUserMock).toHaveBeenCalledWith("uid-1", "1"),
    );
  });

  it("does not delete when the confirm dialog is cancelled", () => {
    render(<FlightDetailsModal flight={baseFlight} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("flight-details-delete-1"));
    fireEvent.click(screen.getByTestId("flight-delete-cancel-1"));

    expect(deleteFlightForUserMock).not.toHaveBeenCalled();
  });
});
