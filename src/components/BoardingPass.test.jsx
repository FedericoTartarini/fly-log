import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));

import { fireEvent, render, screen } from "../../test-utils/index.js";
import { makeRouterWrapper } from "../../test-utils/wrappers.jsx";
import BoardingPass from "./BoardingPass.jsx";
import { pickStubFlight } from "../utils/pickStubFlight.js";
import useFlightStore from "../store.ts";
import { DEFAULT_FILTERS } from "../utils/activeFilters.ts";

const NOW = new Date(2026, 10, 1, 15, 0); // 1 Nov 2026, 3 pm local

const flight = (id, departure_date, extra = {}) => ({
  id,
  departure_date,
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  ...extra,
});

describe("pickStubFlight", () => {
  it("picks the nearest upcoming flight, counting today as upcoming", () => {
    const flights = [
      flight("past", "2026-10-20"),
      flight("later", "2026-11-20"),
      flight("today", "2026-11-01"),
    ];
    expect(pickStubFlight(flights, NOW)).toMatchObject({
      flight: { id: "today" },
      days: 0,
    });
  });

  it("falls back to the most recent past flight", () => {
    const flights = [
      flight("old", "2020-01-01"),
      flight("recent", "2026-10-29"),
    ];
    expect(pickStubFlight(flights, NOW)).toMatchObject({
      flight: { id: "recent" },
      days: -3,
    });
  });

  it("returns null when no flight has a date", () => {
    expect(pickStubFlight([flight("x", null)], NOW)).toBeNull();
  });
});

describe("BoardingPass", () => {
  it("shows the totals and the stub for the filtered flights", () => {
    const flights = [
      flight("1", "2019-05-01", {
        distance_km: 50000,
        flight_time: 30,
        departure_country: "AU",
        arrival_country: "SG",
      }),
      flight("2", "2099-01-02", {
        flight_number: "QF81",
        departure_time: "11:40",
      }),
    ];
    useFlightStore.mockImplementation((selector) =>
      selector({
        filteredFlights: flights,
        allFlights: flights,
        filters: DEFAULT_FILTERS,
      }),
    );

    render(<BoardingPass />, { wrapper: makeRouterWrapper() });

    expect(screen.getByText("Distance flown since 2019")).toBeInTheDocument();
    expect(screen.getByText("50,000 km")).toBeInTheDocument();
    expect(screen.getByText("Once around the Earth")).toBeInTheDocument();
    expect(screen.getByText("1 d")).toBeInTheDocument();
    expect(screen.getByText(/^Next flight, in \d+ days$/)).toBeInTheDocument();
    expect(screen.getByText("QF81")).toBeInTheDocument();
    expect(screen.getByText("11:40")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See all your stats" }),
    ).toHaveAttribute("href", "/stats/all");
  });

  it("opens the stub's flight details when the stub is pressed", async () => {
    const flights = [flight("next", "2099-01-02", { flight_number: "QF81" })];
    useFlightStore.mockImplementation((selector) =>
      selector({
        filteredFlights: [],
        allFlights: flights,
        filters: DEFAULT_FILTERS,
      }),
    );

    render(<BoardingPass />, { wrapper: makeRouterWrapper() });
    fireEvent.click(
      screen.getByRole("button", { name: /^Next flight, in \d+ days$/ }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
