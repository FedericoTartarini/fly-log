import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../test-utils";
import FlightDetailsPanel from "./FlightDetailsPanel";
import { getAirMinutes } from "../utils/airTime";
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
      screen.getByText(
        "No status yet. Check status looks up times, gates and delays for this flight number.",
      ),
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

  it("renders check-in desk without repeating the route's airport names", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: {
            status: "Expected",
            departure: {
              checkInDesk: "12-18",
              airport: { name: "Sydney Airport", shortName: "Sydney Intl" },
            },
            arrival: {
              airport: { name: "Changi Airport" },
            },
          },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText(/Check-in desk 12-18/)).toBeInTheDocument();
    expect(screen.queryByText("Sydney Intl")).not.toBeInTheDocument();
    expect(screen.queryByText("Changi Airport")).not.toBeInTheDocument();
  });

  it("shows the scheduled time separately when it differs from the current estimate", () => {
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
                utc: "2026-09-20 04:44Z",
                local: "2026-09-20 14:44+10:00",
              },
            },
          },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Scheduled 14:30")).toBeInTheDocument();
    expect(screen.getByText("14:44")).toBeInTheDocument();
    expect(screen.getByText("14 min late")).toBeInTheDocument();
  });

  it("shows a on-time chip when scheduled and revised times match", () => {
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

  it("shows an early chip for a negative delay", () => {
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

    expect(screen.getByText("12 min early")).toBeInTheDocument();
  });

  it("uses the actual time for a landed flight when the API supplies it", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: {
            status: "Landed",
            arrival: {
              scheduledTime: {
                utc: "2026-09-20 05:00Z",
                local: "2026-09-20 15:00+10:00",
              },
              actualTime: {
                utc: "2026-09-20 05:12Z",
                local: "2026-09-20 15:12+10:00",
              },
            },
          },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Scheduled 15:00")).toBeInTheDocument();
    expect(screen.getByText("15:12")).toBeInTheDocument();
    expect(screen.getByText("12 min late")).toBeInTheDocument();
  });

  it("shows an amber late chip for a long delay", () => {
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

    expect(screen.getByText("30 min late")).toBeInTheDocument();
  });

  describe("runway times and baggage belt", () => {
    const withLegs = (departure: object, arrival: object) => ({
      ...baseFlight,
      flight_status: { status: "Arrived", departure, arrival },
      flight_status_checked_at: "2026-09-20T12:00:00.000Z",
    });

    it("shows wheels up, touchdown, air time and the baggage belt", () => {
      render(
        <FlightDetailsPanel
          flight={withLegs(
            {
              runwayTime: {
                utc: "2026-09-20 06:08Z",
                local: "2026-09-20 16:08+10:00",
              },
            },
            {
              runwayTime: {
                utc: "2026-09-20 13:59Z",
                local: "2026-09-20 21:59+08:00",
              },
              baggageBelt: "3",
            },
          )}
        />,
      );

      expect(screen.getByText("Wheels up")).toBeInTheDocument();
      expect(screen.getByText("16:08")).toBeInTheDocument();
      expect(screen.getByText("21:59")).toBeInTheDocument();
      // 7 h 51 m in UTC, although the local clocks differ by 5 h 51 m.
      expect(screen.getByText("7 h 51 m")).toBeInTheDocument();
      expect(screen.getByText("Baggage belt 3")).toBeInTheDocument();
    });

    it("hides each missing figure instead of showing a dash", () => {
      render(
        <FlightDetailsPanel
          flight={withLegs(
            {
              runwayTime: {
                utc: "2026-09-20 06:08Z",
                local: "2026-09-20 16:08+10:00",
              },
            },
            {},
          )}
        />,
      );

      expect(screen.getByText("Wheels up")).toBeInTheDocument();
      expect(screen.queryByText("Touchdown")).not.toBeInTheDocument();
      expect(screen.queryByText("In the air")).not.toBeInTheDocument();
      expect(screen.queryByText(/Baggage belt/)).not.toBeInTheDocument();
      expect(screen.queryByText("–")).not.toBeInTheDocument();
    });

    it("leaves the strip out when there are no runway times", () => {
      render(<FlightDetailsPanel flight={withLegs({}, {})} />);
      expect(screen.queryByText("Wheels up")).not.toBeInTheDocument();
    });
  });
});

describe("getAirMinutes", () => {
  const leg = (utc?: string) => ({ runwayTime: utc ? { utc } : undefined });

  it("counts minutes between the UTC runway times", () => {
    expect(
      getAirMinutes(leg("2026-09-20 23:30Z"), leg("2026-09-21 01:05Z")),
    ).toBe(95);
  });

  it("returns null when a time is missing or the order is wrong", () => {
    expect(getAirMinutes(leg("2026-09-20 06:08Z"), leg())).toBeNull();
    expect(getAirMinutes(undefined, leg("2026-09-20 06:08Z"))).toBeNull();
    expect(
      getAirMinutes(leg("2026-09-20 08:00Z"), leg("2026-09-20 07:00Z")),
    ).toBeNull();
  });
});
