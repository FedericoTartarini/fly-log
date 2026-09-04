import { describe, expect, it } from "vitest";
import {
  buildNetworkEvolutionByYear,
  buildRouteNetwork,
  withForceLayout,
} from "./networkUtils";

const flights = [
  {
    departure_date: "2024-01-05",
    departure_airport_iata: "BLQ",
    arrival_airport_iata: "LHR",
  },
  {
    departure_date: "2024-02-10",
    departure_airport_iata: "BLQ",
    arrival_airport_iata: "LHR",
  },
  {
    departure_date: "2025-03-11",
    departure_airport_iata: "LHR",
    arrival_airport_iata: "JFK",
  },
];

describe("networkUtils", () => {
  it("builds weighted route network", () => {
    const out = buildRouteNetwork(flights, 1, 100);
    expect(out.filteredFlightsCount).toBe(3);
    expect(out.nodes.length).toBe(3);
    expect(out.edges.find((e) => e.id === "BLQ->LHR")?.weight).toBe(2);
  });

  it("applies min edge weight", () => {
    const out = buildRouteNetwork(flights, 2, 100);
    expect(out.edges).toHaveLength(1);
    expect(out.edges[0].id).toBe("BLQ->LHR");
  });

  it("produces positioned nodes with force layout", () => {
    const network = buildRouteNetwork(flights, 1, 100);
    const positioned = withForceLayout(network.nodes, network.edges, 800, 500);
    expect(positioned).toHaveLength(network.nodes.length);
    expect(positioned.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });

  it("builds yearly network evolution stats", () => {
    const out = buildNetworkEvolutionByYear(flights);
    expect(out).toEqual([
      { year: "2024", flights: 2, airports: 2, routes: 1 },
      { year: "2025", flights: 1, airports: 2, routes: 1 },
    ]);
  });
});
