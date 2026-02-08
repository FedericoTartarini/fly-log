import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../test-utils/index.js";
import FlightCard from "./FlightCard";
import type { EnhancedFlight } from "../types/enhancedFlight.ts";

const mockFlight: EnhancedFlight = {
  id: "1",
  user_id: "user1",
  departure_date: "2025-08-14",
  departure_time: null,
  departure_airport_iata: "SIN",
  arrival_airport_iata: "BLQ",
  airline_iata: "QF",
  flight_number: "",
  created_at: "2025-08-04T12:25:44.520876",
  departure_coordinates: [1.35019, 103.994003],
  arrival_coordinates: [44.5354, 11.2887],
  distance_km: 10116.5,
  flight_time: 11.24,
  departure_country: "SG",
  arrival_country: "IT",
  international: true,
  airline_name: "Qantas",
  airline_icon_path: "qantas_mono.svg",
};

describe("FlightCard", () => {
  it("renders flight information", () => {
    render(
      <FlightCard
        flight={mockFlight}
        title="Test EnhancedFlight"
        color="blue"
      />,
    );
    expect(screen.getByText("Test EnhancedFlight"));
    expect(screen.getByText("Qantas"));
    expect(screen.getByText("SG"));

    // Accept either decimal-hour format (e.g. "11.24h flight time") or hours+minutes (e.g. "11h 14m flight time")
    const ft = mockFlight.flight_time;
    const hours = Math.floor(ft);
    const minutes = Math.round((ft - hours) * 60);
    const timeRegex = new RegExp(
      `${hours}(?:\\.\\\d+h|h\\s+${minutes}m)\\sflight time`,
    );
    expect(screen.getByText(timeRegex));

    expect(screen.getByText("10117 km"));
    expect(screen.getByText("SIN → BLQ"));
    expect(screen.getByText("SG"));
    expect(screen.getByText("IT"));
  });
});
