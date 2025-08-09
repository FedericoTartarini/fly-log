import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import DistanceStatsCard from "./DistanceStatsCard";

const renderWithProvider = (ui: React.ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("DistanceStatsCard", () => {
  it("renders total and mean distance", () => {
    renderWithProvider(
      <DistanceStatsCard totalDistance={100000} totalFlights={10} />,
    );
    expect(screen.getByText("Distance Statistics"));
    expect(screen.getByText("Total Distance (km)"));
    expect(screen.getByText("Mean Distance (km)"));
    expect(screen.getByText("10,000")); // mean
    expect(screen.getByText("100,000")); // total
  });

  it("renders journey to space section", () => {
    renderWithProvider(
      <DistanceStatsCard totalDistance={32751} totalFlights={2} />,
    );
    expect(screen.getByText("Journey to Space"));
    expect(screen.getByText("🌍 Earth"));
    expect(screen.getByText(/around Earth/));
    expect(screen.getByText("🌙 Moon"));
    expect(screen.getByText(/to Moon/));
    expect(screen.getByText("🚀 Mars"));
    expect(screen.getByText(/to Mars/));
    expect(screen.getByText("Total Distance (km)"));
    expect(screen.getByText("32,751"));
  });
});
