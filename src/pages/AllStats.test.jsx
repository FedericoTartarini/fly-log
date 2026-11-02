import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));

import { render, screen } from "../../test-utils/index.js";
import { makeRouterWrapper } from "../../test-utils/wrappers.jsx";
import AllStats from "./AllStats.jsx";
import useFlightStore from "../store.ts";

const flights = [
  {
    distance_km: 900000,
    flight_time: 36,
    co2_kg: 1234.4,
    departure_country: "AU",
    arrival_country: "SG",
    departure_coordinates: [-33.9, 151.2],
    arrival_coordinates: [1.4, 103.9],
  },
  {
    distance_km: 102000,
    flight_time: 12,
    co2_kg: 100,
    departure_country: "SG",
    arrival_country: "GB",
    departure_coordinates: [1.4, 103.9],
    arrival_coordinates: [51.5, -0.5],
  },
];

describe("AllStats", () => {
  beforeEach(() => {
    // Reduced motion skips the count-up, so the final numbers show at once.
    window.matchMedia.mockImplementation((query) => ({
      matches: query.includes("reduce"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    useFlightStore.mockImplementation((selector) =>
      selector({ filteredFlights: flights, isLoading: false, error: null }),
    );
  });

  it("shows every stat for the filtered flights", () => {
    render(<AllStats />, { wrapper: makeRouterWrapper() });

    expect(screen.getByText("1,334")).toBeInTheDocument();
    expect(screen.getByText("2.0")).toBeInTheDocument(); // days in the air
    expect(screen.getByText("501,000")).toBeInTheDocument(); // km per flight
    // Three countries, on three continents: Oceania, Asia and Europe.
    expect(screen.getAllByText("3")).toHaveLength(2);
    expect(screen.getByText("How far is 1,002,000 km?")).toBeInTheDocument();
  });

  it("fills each bar with progress towards the next lap or trip", () => {
    render(<AllStats />, { wrapper: makeRouterWrapper() });

    // 1,002,000 km is 25.003 laps of the Earth and 2.607 trips to the Moon.
    expect(screen.getByText("25×")).toBeInTheDocument();
    expect(screen.getByText("0% of the way to lap 26")).toBeInTheDocument();
    expect(screen.getByText("2×")).toBeInTheDocument();
    expect(screen.getByText("60% of the way to trip 3")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Progress towards trip 3 to the Moon",
      }),
    ).toHaveAttribute("aria-valuenow", "60");
  });

  it("counts up once, then shows filter changes at once", () => {
    window.matchMedia.mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    // Each animation frame lands after the count-up has finished.
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((step) => {
      step(performance.now() + 5000);
      return 1;
    });
    const { rerender } = render(<AllStats />, {
      wrapper: makeRouterWrapper(),
    });
    expect(screen.getByText("1,334")).toBeInTheDocument();

    const raf = window.requestAnimationFrame.mock.calls.length;
    useFlightStore.mockImplementation((selector) =>
      selector({ filteredFlights: [flights[1]], isLoading: false }),
    );
    rerender(<AllStats />);
    expect(screen.getByText("100")).toBeInTheDocument(); // CO₂e of one flight
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(raf);
  });

  it("sweeps only the bars that start with a completed lap or trip, once", () => {
    // 102,000 km is 2 laps of the Earth but under one trip to the Moon.
    useFlightStore.mockImplementation((selector) =>
      selector({ filteredFlights: [flights[1]], isLoading: false }),
    );
    const { container, rerender } = render(<AllStats />, {
      wrapper: makeRouterWrapper(),
    });
    const sweeps = () => container.querySelectorAll('[class*="sweep"]');
    expect(sweeps()).toHaveLength(1);

    // Now a trip is complete too, but the bar already decided on first view.
    useFlightStore.mockImplementation((selector) =>
      selector({ filteredFlights: flights, isLoading: false }),
    );
    rerender(<AllStats />);
    expect(screen.getByText("2×")).toBeInTheDocument();
    expect(sweeps()).toHaveLength(1);
  });

  it("unmounts cleanly when scrollTo returns a promise, as in Chrome", () => {
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockReturnValue(Promise.resolve());
    const { unmount } = render(<AllStats />, {
      wrapper: makeRouterWrapper(),
    });
    expect(() => unmount()).not.toThrow();
    scrollTo.mockRestore();
  });
});
