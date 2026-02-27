import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  userEvent,
} from "../../test-utils/index.js";
import WorldTour from "./WorldTour";
import useFlightStore from "../store";

vi.mock("d3", async () => {
  const actual = await vi.importActual("d3");
  return {
    ...actual,
    json: vi.fn().mockResolvedValue({
      type: "FeatureCollection",
      features: [],
    }),
  };
});

const sampleFlights = [
  {
    id: "f1",
    departure_date: "2024-03-10",
    departure_airport_iata: "SYD",
    arrival_airport_iata: "MEL",
    departure_coordinates: [-33.9399, 151.1753],
    arrival_coordinates: [-37.6733, 144.8433],
  },
  {
    id: "f2",
    departure_date: "2024-07-21",
    departure_airport_iata: "MEL",
    arrival_airport_iata: "PER",
    departure_coordinates: [-37.6733, 144.8433],
    arrival_coordinates: [-31.9403, 115.9669],
  },
  {
    id: "f3",
    departure_date: "2099-01-05",
    departure_airport_iata: "SYD",
    arrival_airport_iata: "LAX",
    departure_coordinates: [-33.9399, 151.1753],
    arrival_coordinates: [33.9416, -118.4085],
  },
];

const sameDayFlights = [
  {
    id: "early",
    departure_date: "2024-06-01",
    departure_time: "03:15",
    departure_airport_iata: "BNE",
    arrival_airport_iata: "PER",
    departure_coordinates: [-27.3928, 153.1175],
    arrival_coordinates: [-31.9403, 115.9669],
  },
  {
    id: "late",
    departure_date: "2024-06-01",
    departure_time: "08:30",
    departure_airport_iata: "SYD",
    arrival_airport_iata: "MEL",
    departure_coordinates: [-33.9399, 151.1753],
    arrival_coordinates: [-37.6733, 144.8433],
  },
];

const multiYearFlights = [
  {
    id: "y1",
    departure_date: "2020-02-10",
    departure_airport_iata: "SYD",
    arrival_airport_iata: "MEL",
    departure_coordinates: [-33.9399, 151.1753],
    arrival_coordinates: [-37.6733, 144.8433],
  },
  {
    id: "y2",
    departure_date: "2024-05-21",
    departure_airport_iata: "MEL",
    arrival_airport_iata: "PER",
    departure_coordinates: [-37.6733, 144.8433],
    arrival_coordinates: [-31.9403, 115.9669],
  },
  {
    id: "y3",
    departure_date: "2025-11-05",
    departure_airport_iata: "BNE",
    arrival_airport_iata: "LAX",
    departure_coordinates: [-27.3928, 153.1175],
    arrival_coordinates: [33.9416, -118.4085],
  },
];

describe("WorldTour", () => {
  beforeEach(() => {
    useFlightStore.setState({
      allFlights: [],
      filteredFlights: [],
      selectedYear: "all",
      filters: {
        airline: null,
        departureAirport: null,
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows no-routes state and disables start when there are no flights", async () => {
    render(<WorldTour />);

    await waitFor(() => {
      expect(
        screen.getByText("No valid routes found for this filter."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Start animation" }),
    ).toBeDisabled();
  });

  it("keeps route label hidden before start and shows it after start", async () => {
    useFlightStore.setState({
      allFlights: sampleFlights,
      filteredFlights: sampleFlights,
    });

    render(<WorldTour />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Start animation" }),
      ).toBeEnabled();
    });

    expect(screen.queryByText(/Route \d+\/\d+:/)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Start animation" }),
    );

    expect(screen.getByText(/Route 1\/\d+:/)).toBeInTheDocument();
  });

  it("switches scope to past flights and hides year range controls", async () => {
    useFlightStore.setState({
      allFlights: sampleFlights,
      filteredFlights: sampleFlights,
    });

    render(<WorldTour />);

    await waitFor(() => {
      expect(screen.getByLabelText("From year")).toBeInTheDocument();
      expect(screen.getByLabelText("To year")).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByLabelText("Flights"), "past");

    expect(screen.queryByLabelText("From year")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("To year")).not.toBeInTheDocument();
  });

  it("orders flights on the same day by departure time", async () => {
    useFlightStore.setState({
      allFlights: sameDayFlights,
      filteredFlights: sameDayFlights,
    });

    render(<WorldTour />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Start animation" }),
      ).toBeEnabled();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Start animation" }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Route 1\/2: BNE -> PER/)).toBeInTheDocument();
    });
  });

  it("limits To year options to years >= From year", async () => {
    useFlightStore.setState({
      allFlights: multiYearFlights,
      filteredFlights: multiYearFlights,
    });

    render(<WorldTour />);

    const fromSelect = await screen.findByLabelText("From year");
    const toSelect = screen.getByLabelText("To year");

    await userEvent.selectOptions(fromSelect, "2024");

    await waitFor(() => {
      const toOptions = within(toSelect).getAllByRole("option");
      expect(toOptions.map((option) => option.value)).toEqual(["2024", "2025"]);
    });
  });

  it("initialises zoom with correct scale constraints", async () => {
    const d3 = await import("d3");
    const mockZoomInstance = Object.assign(vi.fn(), {
      scaleExtent: vi.fn().mockImplementation(() => mockZoomInstance),
      on: vi.fn().mockImplementation(() => mockZoomInstance),
    });
    const zoomSpy = vi.spyOn(d3, "zoom").mockReturnValue(mockZoomInstance);

    useFlightStore.setState({
      allFlights: sampleFlights,
      filteredFlights: sampleFlights,
    });

    render(<WorldTour />);

    await waitFor(() => expect(zoomSpy).toHaveBeenCalled());
    expect(mockZoomInstance.scaleExtent).toHaveBeenCalledWith([0.7, 2.5]);

    zoomSpy.mockRestore();
  });
});
