import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { tileLayers, scheme } = vi.hoisted(() => ({
  tileLayers: [],
  scheme: { value: "light" },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: (props) => {
    tileLayers.push(props);
    return null;
  },
  Polyline: () => null,
  CircleMarker: () => null,
  Pane: ({ name, children }) => <div data-pane={name}>{children}</div>,
  AttributionControl: () => null,
  useMap: () => null,
}));

vi.mock("@mantine/core", async (importOriginal) => ({
  ...(await importOriginal()),
  useComputedColorScheme: () => scheme.value,
}));

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));

import { render } from "../../test-utils/index.js";
import WorldMap from "./WorldMap.jsx";
import useFlightStore from "../store.ts";

describe("WorldMap tiles", () => {
  beforeEach(() => {
    tileLayers.length = 0;
    useFlightStore.mockImplementation((selector) =>
      selector({ filteredFlights: [], allFlights: [] }),
    );
  });

  it("uses Esri dark tiles with a place-name layer in dark mode", () => {
    scheme.value = "dark";
    render(<WorldMap />);

    const [base, labels] = tileLayers;
    expect(base.url).toContain("World_Dark_Gray_Base");
    expect(base.keepBuffer).toBe(4);
    expect(base.attribution).toBe("Esri | &copy; OpenStreetMap");
    expect(labels.url).toContain("World_Dark_Gray_Reference");
    expect(labels.keepBuffer).toBe(4);
  });

  it("uses CARTO light tiles and no place-name layer in light mode", () => {
    scheme.value = "light";
    render(<WorldMap />);

    expect(tileLayers).toHaveLength(1);
    expect(tileLayers[0].url).toContain("basemaps.cartocdn.com");
    expect(tileLayers[0].url).toContain("light_all");
    expect(tileLayers[0].keepBuffer).toBe(4);
  });

  it("draws faded routes in their own pane only while a filter is on", () => {
    const flight = {
      id: 1,
      departure_date: "2025-01-01",
      departure_coordinates: [51.47, -0.45],
      arrival_coordinates: [40.64, -73.78],
    };
    const other = { ...flight, id: 2 };

    useFlightStore.mockImplementation((selector) =>
      selector({ filteredFlights: [flight], allFlights: [flight, other] }),
    );
    const { unmount } = render(<WorldMap />);
    expect(document.querySelector('[data-pane="faded-routes"]')).not.toBeNull();
    unmount();

    useFlightStore.mockImplementation((selector) =>
      selector({
        filteredFlights: [flight, other],
        allFlights: [flight, other],
      }),
    );
    render(<WorldMap />);
    expect(document.querySelector('[data-pane="faded-routes"]')).toBeNull();
  });
});
