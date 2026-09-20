import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../test-utils";
import FlightDetailsPanel from "./FlightDetailsPanel";
import type { enhancedFlight } from "../types/enhancedFlight";

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
  it("shows a placeholder message when no status has been checked", () => {
    render(<FlightDetailsPanel flight={baseFlight} />);
    expect(
      screen.getByText("No live status checked yet."),
    ).toBeInTheDocument();
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
    // Regression: i18next's default HTML-escaping turns "/" into "&#x2F;" in
    // interpolated values. The checked-at timestamp is a locale-formatted
    // date (e.g. "20/09/2026, ...") rendered as plain React text, not HTML,
    // so it must never contain the escaped entity.
    expect(document.body.textContent).not.toContain("&#x2F;");
  });

  it("shows the source attribution once a check has happened", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: { status: "Landed" },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByText("Source: AeroDataBox")).toBeInTheDocument();
  });

  it("renders check-in desk and full airport names when present", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: {
            status: "Expected",
            departure: {
              checkInDesk: "12-18",
              airport: { name: "Sydney Airport", municipalityName: "Sydney" },
            },
            arrival: {
              airport: {
                name: "Changi Airport",
                municipalityName: "Singapore",
              },
            },
          },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText(/Check-in desk: 12-18/)).toBeInTheDocument();
    expect(screen.getByText(/Sydney Airport, Sydney/)).toBeInTheDocument();
    expect(
      screen.getByText(/Changi Airport, Singapore/),
    ).toBeInTheDocument();
  });

  it("shows a green on-time badge when scheduled and revised times match", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: {
            status: "Expected",
            departure: {
              scheduledTime: {
                utc: "2026-09-20 04:30Z",
                local: "2026-09-20 14:30+10:00",
              },
              revisedTime: {
                utc: "2026-09-20 04:30Z",
                local: "2026-09-20 14:30+10:00",
              },
            },
          },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("14:30")).toBeInTheDocument();
    expect(screen.getByText("On time")).toBeInTheDocument();
  });

  it("shows a green early badge for a negative delay", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: {
            status: "Arrived",
            arrival: {
              scheduledTime: {
                utc: "2026-09-20 05:00Z",
                local: "2026-09-20 15:00+10:00",
              },
              revisedTime: {
                utc: "2026-09-20 04:48Z",
                local: "2026-09-20 14:48+10:00",
              },
            },
          },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("-12 min")).toBeInTheDocument();
  });

  it("shows a red badge for a long delay", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: {
            status: "Expected",
            departure: {
              scheduledTime: {
                utc: "2026-09-20 04:30Z",
                local: "2026-09-20 14:30+10:00",
              },
              revisedTime: {
                utc: "2026-09-20 05:00Z",
                local: "2026-09-20 15:00+10:00",
              },
            },
          },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("+30 min")).toBeInTheDocument();
  });
});
