import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FlightCard from "./FlightCard";
import type { EnhancedFlight } from "../types/enhancedFlight.ts";
import { MantineProvider } from "@mantine/core";

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
  airline_primary_color: null,
  airline_icon_path: "qantas_mono.svg",
};

const renderWithProvider = (ui: React.ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("FlightCard", () => {
  it("renders flight information", () => {
    renderWithProvider(
      <FlightCard
        flight={mockFlight}
        title="Test EnhancedFlight"
        color="blue"
      />,
    );
    expect(screen.getByText("Test EnhancedFlight"));
    expect(screen.getByText("Qantas"));
    expect(screen.getByText("SG"));
    expect(screen.getByText("11.24h flight time"));
    expect(screen.getByText("10,117 km"));
    expect(screen.getByText("SIN → BLQ"));
    expect(screen.getByText("SG"));
    expect(screen.getByText("IT"));
  });
});
