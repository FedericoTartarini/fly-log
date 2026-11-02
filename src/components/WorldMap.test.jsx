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
  Pane: ({ children }) => <div>{children}</div>,
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
    expect(base.attribution).toBe("Tiles &copy; Esri");
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
});
