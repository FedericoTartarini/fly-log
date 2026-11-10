import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  userEvent,
  act,
} from "../../test-utils/index.js";
import WorldTour from "./WorldTour";
import useFlightStore from "../store";
import { DEFAULT_FILTERS } from "../utils/activeFilters";

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

describe("WorldTour", () => {
  beforeEach(() => {
    useFlightStore.setState({
      allFlights: [],
      filteredFlights: [],
      isLoading: false,
      filters: DEFAULT_FILTERS,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const withFlights = (flights) =>
    useFlightStore.setState({ allFlights: flights, filteredFlights: flights });

  it("says there is nothing to play when there are no flights", async () => {
    render(<WorldTour />);

    expect(
      await screen.findByText(/No flights to play yet/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Play the tour" }),
    ).not.toBeInTheDocument();
  });

  it("announces loading and holds back the no-routes alert while flights load", () => {
    useFlightStore.setState({ isLoading: true });
    render(<WorldTour />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading...");
    expect(screen.queryByText(/No flights to play yet/)).toBeNull();
  });

  it("plays the filtered flights, not every flight", () => {
    useFlightStore.setState({
      allFlights: sampleFlights,
      filteredFlights: sampleFlights.slice(0, 2),
    });
    render(<WorldTour />);

    expect(
      screen.getByText("2 flights, played oldest first"),
    ).toBeInTheDocument();
    expect(screen.getByText("Flight 1 of 2")).toBeInTheDocument();
  });

  it("steps through the flights with next, previous and restart", async () => {
    withFlights(sampleFlights);
    render(<WorldTour />);

    const pass = screen.getByRole("region", { name: "Current flight" });
    expect(within(pass).getByText("Flight 1 of 3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous flight" }),
    ).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next flight" }));
    await userEvent.click(screen.getByRole("button", { name: "Next flight" }));
    // The last flight is in 2099, so it is upcoming.
    expect(
      within(pass).getByText("Upcoming · Flight 3 of 3"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next flight" })).toBeDisabled();
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      "Flight 3 of 3, SYD to LAX",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Back to the first flight" }),
    );
    expect(within(pass).getByText("Flight 1 of 3")).toBeInTheDocument();
  });

  it("advances to the next flight while playing, and pauses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFlights(sampleFlights);
    render(<WorldTour />);

    await userEvent.click(
      screen.getByRole("button", { name: "Play the tour" }),
    );
    expect(
      screen.getByRole("button", { name: "Pause the tour" }),
    ).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(1700));
    expect(screen.getByText("Flight 2 of 3")).toBeInTheDocument();
    // Silent during play, so it does not read out every flight.
    expect(screen.getByText("Flight 2 of 3").parentElement).toHaveAttribute(
      "aria-live",
      "off",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Pause the tour" }),
    );
    expect(
      screen.getByRole("button", { name: "Resume the tour" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Flight 2 of 3").parentElement).toHaveAttribute(
      "aria-live",
      "polite",
    );
    vi.useRealTimers();
  });

  it("cycles the speed chip through 0.5×, 1× and 2×", async () => {
    withFlights(sampleFlights);
    render(<WorldTour />);

    const chip = screen.getByRole("button", {
      name: "1× (normal). Change speed",
    });
    expect(chip).toHaveTextContent("1×");
    await userEvent.click(chip);
    expect(chip).toHaveTextContent("2×");
    await userEvent.click(chip);
    expect(chip).toHaveTextContent("0.5×");
    expect(chip).toHaveAccessibleName("0.5× (slow). Change speed");
  });

  it("initialises zoom with correct scale constraints", async () => {
    const d3 = await import("d3");
    const mockZoomInstance = Object.assign(vi.fn(), {
      scaleExtent: vi.fn().mockImplementation(() => mockZoomInstance),
      on: vi.fn().mockImplementation(() => mockZoomInstance),
    });
    const zoomSpy = vi.spyOn(d3, "zoom").mockReturnValue(mockZoomInstance);

    withFlights(sampleFlights);
    render(<WorldTour />);

    await waitFor(() => expect(zoomSpy).toHaveBeenCalled());
    expect(mockZoomInstance.scaleExtent).toHaveBeenCalledWith([0.7, 4.5]);

    zoomSpy.mockRestore();
  });
});
