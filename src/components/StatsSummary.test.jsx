import { describe, it, expect, vi } from "vitest";
import { render } from "../../test-utils/render";
import StatsSummary from "./StatsSummary";
import useFlightStore from "../store";
import { Ids } from "../constants/Ids.js";

vi.mock("../store");

describe("StatsSummary", () => {
  it("should display correct total valuea", () => {
    useFlightStore.mockReturnValue({ selectedYear: "all" });

    render(<StatsSummary />);

    // Find element by ID and check its text content
    const totalFlightsElement = document.getElementById(
      Ids.STATS.TOTAL_FLIGHTS,
    );
    expect(totalFlightsElement).toHaveTextContent("26");

    const totalDistanceElement = document.getElementById(
      Ids.STATS.TOTAL_DISTANCE,
    );
    expect(totalDistanceElement).toHaveTextContent("97,407");

    const totalTimeElement = document.getElementById(Ids.STATS.TOTAL_TIME);
    expect(totalTimeElement).toHaveTextContent("4.5");

    const airportsVisitedElement = document.getElementById(
      Ids.STATS.AIRPORTS_VISITED,
    );
    expect(airportsVisitedElement).toHaveTextContent("20");

    const airlinesFlownElement = document.getElementById(
      Ids.STATS.AIRLINES_FLOWN,
    );
    expect(airlinesFlownElement).toHaveTextContent("11");
  });

  it("should display correct total values for 2024", () => {
    useFlightStore.mockReturnValue({ selectedYear: "2024" });

    render(<StatsSummary />);

    // Find element by ID and check its text content
    const totalFlightsElement = document.getElementById(
      Ids.STATS.TOTAL_FLIGHTS,
    );
    expect(totalFlightsElement).toHaveTextContent("17");

    const totalDistanceElement = document.getElementById(
      Ids.STATS.TOTAL_DISTANCE,
    );
    expect(totalDistanceElement).toHaveTextContent("58,800");

    const totalTimeElement = document.getElementById(Ids.STATS.TOTAL_TIME);
    expect(totalTimeElement).toHaveTextContent("2.7");

    const airportsVisitedElement = document.getElementById(
      Ids.STATS.AIRPORTS_VISITED,
    );
    expect(airportsVisitedElement).toHaveTextContent("14");

    const airlinesFlownElement = document.getElementById(
      Ids.STATS.AIRLINES_FLOWN,
    );
    expect(airlinesFlownElement).toHaveTextContent("8");
  });
});
