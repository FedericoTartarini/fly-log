import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));
vi.mock("../components/NoFlightsCard.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="no-flights-card" />,
}));

import { render, screen, userEvent, waitFor } from "../../test-utils/index.js";
import Timeline from "./Timeline";
import useFlightStore from "../store.ts";
import { CHART_METRIC } from "../constants/filters.ts";

const mockedUseFlightStore = useFlightStore;

const BASE_STATE = {
  allFlights: [],
  isLoading: false,
  error: null,
  chartMetric: CHART_METRIC.FLIGHTS,
  setChartMetric: vi.fn(),
};

const applyMockState = (overrides = {}) => {
  mockedUseFlightStore.mockImplementation((selector) => {
    const merged = { ...BASE_STATE, ...overrides };
    return typeof selector === "function" ? selector(merged) : merged;
  });
};

const flights = [
  { id: "1", departure_date: "2025-03-10T08:00:00Z", distance_km: 700 },
  { id: "2", departure_date: "2025-03-20T20:00:00Z", distance_km: 800 },
  { id: "3", departure_date: "2024-07-15T09:00:00Z", distance_km: 12000 },
];

const cy = (id) => document.querySelector(`[data-cy="${id}-value"]`);

describe("Timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a skeleton while flights are being fetched", () => {
    applyMockState({ isLoading: true });
    render(<Timeline />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error message instead of the empty state when the fetch failed", () => {
    applyMockState({ allFlights: [], error: "Network error" });
    render(<Timeline />);
    expect(
      screen.getByText("Error loading flight data: Network error"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("no-flights-card")).not.toBeInTheDocument();
  });

  it("shows the add-flight call to action when there are no flights", async () => {
    applyMockState({ allFlights: [] });
    render(<Timeline />);
    await waitFor(() => {
      expect(screen.getByTestId("no-flights-card")).toBeInTheDocument();
    });
  });

  it("lists every year newest first, with matrix stats in the tiles", async () => {
    applyMockState({
      allFlights: [
        ...flights,
        { id: "4", departure_date: "2022-01-05T08:00:00Z" },
      ],
    });
    render(<Timeline />);

    // 2023 has no flights but still gets a row, so the calendar is unbroken.
    await waitFor(() => {
      expect(screen.getByText("2023")).toBeInTheDocument();
    });
    const years = ["2025", "2024", "2023", "2022"].map((y) =>
      screen.getByText(y),
    );
    years.reduce((above, below) => {
      expect(above.compareDocumentPosition(below)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      return below;
    });

    expect(cy("timeline-total-flights")).toHaveTextContent("4");
    expect(cy("timeline-active-months")).toHaveTextContent("3");
    // Jan 2022 to Mar 2025 is 39 months.
    expect(screen.getByText("of 39")).toBeInTheDocument();
    expect(screen.getByText("since 2022")).toBeInTheDocument();
    expect(cy("timeline-busiest-month")).toHaveTextContent("Mar 25");
  });

  it("selects the busiest month when the page opens", async () => {
    applyMockState({ allFlights: flights });
    render(<Timeline />);

    const busiest = await screen.findByRole("button", {
      name: "Mar 2025 · 2 flights",
    });
    expect(busiest).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("March 2025")).toBeInTheDocument();
    expect(screen.getByText("· 2 flights")).toBeInTheDocument();
  });

  it("reads out a month when it is tapped", async () => {
    applyMockState({ allFlights: flights });
    render(<Timeline />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Jul 2024 · 1 flight" }),
    );
    expect(screen.getByText("July 2024")).toBeInTheDocument();
    expect(screen.getByText("· 1 flight")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mar 2025 · 2 flights" }),
    ).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(
      screen.getByRole("button", { name: "Jan 2025 · no flights" }),
    );
    expect(screen.getByText("· no flights")).toBeInTheDocument();
  });

  it("labels the flights legend from None to 4+", async () => {
    applyMockState({ allFlights: flights });
    render(<Timeline />);

    await waitFor(() => {
      expect(screen.getByText("None")).toBeInTheDocument();
    });
    expect(screen.getByText("4+")).toBeInTheDocument();
  });

  it("switches the heatmap to kilometres", async () => {
    applyMockState({
      allFlights: flights,
      chartMetric: CHART_METRIC.DISTANCE,
    });
    render(<Timeline />);

    await waitFor(() => {
      expect(cy("timeline-total-flights")).toHaveTextContent("13.5K");
    });
    // Jul 2024 (12,000 km) beats Mar 2025 (1,500 km), the reverse of the
    // flight-count ranking, so it is the month selected and the legend top.
    expect(cy("timeline-busiest-month")).toHaveTextContent("Jul 24");
    expect(screen.getByText("· 12,000 km")).toBeInTheDocument();
    expect(screen.getAllByText("12K")).toHaveLength(2);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("counts no months when no flight has a distance yet", async () => {
    applyMockState({
      allFlights: [{ id: "1", departure_date: "2025-03-10T08:00:00Z" }],
      chartMetric: CHART_METRIC.DISTANCE,
    });
    render(<Timeline />);

    await waitFor(() => {
      expect(cy("timeline-active-months")).toHaveTextContent("0");
    });
    expect(screen.getByText("of 0")).toBeInTheDocument();
  });
});
