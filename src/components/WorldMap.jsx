import React, { useEffect, useMemo } from "react";
import {
  AttributionControl,
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Pane,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useComputedColorScheme } from "@mantine/core";
import LatLon from "geodesy/latlon-spherical.js";
import useFlightStore from "../store.ts";
import { parseToDate } from "../utils/dateUtils";

// Changes the tile URLs so browsers drop cached tiles; see tileUrl below.
const TILE_CACHE_BUST = "2026-10";

// Helper to check if coordinates are valid
const isValidCoords = (coord) =>
  Array.isArray(coord) &&
  coord.length === 2 &&
  coord.every((n) => typeof n === "number" && isFinite(n));

// Helper to check if a flight has valid coordinates
const isValidFlight = (flight) =>
  isValidCoords(flight.departure_coordinates) &&
  isValidCoords(flight.arrival_coordinates);

// Helper to generate points along the great-circle path
function getGreatCirclePath(from, to, numPoints = 300) {
  const start = new LatLon(from[0], from[1]);
  const end = new LatLon(to[0], to[1]);
  const path = [];
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const intermediate = start.intermediatePointTo(end, fraction);
    path.push([intermediate.lat, intermediate.lon]);
  }
  return path;
}

// Helper to split a path that crosses the antimeridian
function splitPathAtAntimeridian(path) {
  const segments = [];
  let currentSegment = [];

  for (let i = 0; i < path.length; i++) {
    const point = path[i];
    if (i > 0) {
      const prevPoint = path[i - 1];
      // Check for longitude jump
      if (Math.abs(point[1] - prevPoint[1]) > 180) {
        // End previous segment and start a new one
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
    currentSegment.push(point);
  }
  segments.push(currentSegment);
  return segments;
}

/**
 * Calculate the centroid of all coordinates.
 * @param {Array} flights - Array of flight objects
 * @returns {[number, number]} [lat, lon]
 */
const getFlightsCentroid = (flights) => {
  const coords = flights
    .flatMap((f) => [f.departure_coordinates, f.arrival_coordinates])
    .filter(isValidCoords);
  if (coords.length === 0) return [25, 74];

  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  let x = 0,
    y = 0,
    z = 0;
  for (const [lat, lon] of coords) {
    const latR = toRad(lat);
    const lonR = toRad(lon);
    x += Math.cos(latR) * Math.cos(lonR);
    y += Math.cos(latR) * Math.sin(lonR);
    z += Math.sin(latR);
  }
  x /= coords.length;
  y /= coords.length;
  z /= coords.length;

  const lon = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);
  return [toDeg(lat), toDeg(lon)];
};

/**
 * Calculate the optimal viewing bounds, handling the antimeridian (Pacific) wrap.
 * This ensures that if flights cross the Pacific, the map centers there
 * rather than splitting the view.
 */
const getFlightsBounds = (flights) => {
  const coords = flights
    .flatMap((f) => [f.departure_coordinates, f.arrival_coordinates])
    .filter(isValidCoords);

  if (!coords.length)
    return [
      [-90, -180],
      [90, 180],
    ];

  let minLat = 90;
  let maxLat = -90;
  const lons = [];

  coords.forEach(([lat, lon]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    lons.push(lon);
  });

  // Sort longitudes to find the biggest gap between them
  lons.sort((a, b) => a - b);

  let maxGap = 0;
  let gapEndIndex = 0;

  for (let i = 0; i < lons.length - 1; i++) {
    const gap = lons[i + 1] - lons[i];
    if (gap > maxGap) {
      maxGap = gap;
      gapEndIndex = i;
    }
  }

  // Check the gap crossing the antimeridian (from last point back to first)
  const antimeridianGap = 360 - (lons[lons.length - 1] - lons[0]);

  // Define View Longitudes
  let minLon, maxLon;

  if (antimeridianGap > maxGap) {
    // The gap across the date line is the biggest (e.g., Atlantic is the gap).
    // Standard view [-180, 180] is fine.
    minLon = lons[0];
    maxLon = lons[lons.length - 1];
  } else {
    // The gap is inside the standard map (e.g., the Atlantic).
    // We should wrap around the Pacific.
    // Start after the gap, and go to the start of the gap + 360
    minLon = lons[gapEndIndex + 1];
    maxLon = lons[gapEndIndex] + 360;
  }

  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
};

/**
 * Component to fit map to bounds after render.
 */
const FitMapToBounds = ({ bounds }) => {
  const map = useMap();
  const prevKey = React.useRef("");
  useEffect(() => {
    if (!bounds || !map) return;
    const key = JSON.stringify(bounds);
    if (prevKey.current === key) return;
    prevKey.current = key;
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [bounds, map]);
  return null;
};

// Leaflet map rendering flight paths and markers.
const WorldMap = ({ height = "60vh" }) => {
  const filteredFlights = useFlightStore((s) => s.filteredFlights);
  const allFlights = useFlightStore((s) => s.allFlights);
  // With a filter on, every route still shows, but only the matching ones in
  // strong colour.
  const filtering = filteredFlights.length < allFlights.length;
  const fadedFlights = useMemo(() => {
    const matching = new Set(filteredFlights.map((flight) => flight.id));
    return allFlights.filter((flight) => !matching.has(flight.id));
  }, [allFlights, filteredFlights]);
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  // One canvas for all routes, padded a full screen on each side. Leaflet only
  // draws what sits inside the padded area, so routes are already there while
  // the map is dragged, instead of appearing when the mouse is released.
  const renderer = useMemo(() => L.canvas({ padding: 1 }), []);

  // Use the new smart bounds logic
  const bounds = useMemo(
    () => getFlightsBounds(filteredFlights),
    [filteredFlights],
  );

  // Center is less important now that we have smart bounds,
  // but we keep it for fallback.
  const center = useMemo(
    () => getFlightsCentroid(filteredFlights),
    [filteredFlights],
  );

  // CARTO now requires a (free) API key on its raster tiles: https://carto.com/basemaps/apikey/
  // {r} + detectRetina below requests @2x tiles on HiDPI screens, which is where the free
  // rasters previously looked washed out/blurry.
  // Light mode only: CARTO changed light_all's colours at some point, but browsers
  // kept serving old tiles from their HTTP cache. Bump TILE_CACHE_BUST
  // whenever CARTO restyles light_all, so every browser refetches all tiles.
  // Dark mode uses Esri's Dark Gray Canvas (no key needed), which keeps the
  // ocean and land apart without a CSS filter. Its place names are a second
  // layer on top, so they stay readable.
  const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
  const isDark = computedColorScheme === "dark";
  const tileUrl = isDark
    ? "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${cartoApiKey}&v=${TILE_CACHE_BUST}`;
  const labelsUrl =
    "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

  const attribution = isDark
    ? "Esri | &copy; OpenStreetMap"
    : "&copy; OpenStreetMap &copy; CARTO";

  // Helper to shift coordinates for ghost copies
  const shiftCoords = (coords, offset) => {
    return coords.map((coord) => {
      // Handle simple [lat, lon] or array of arrays [[lat, lon], ...]
      if (Array.isArray(coord[0])) return shiftCoords(coord, offset);
      return [coord[0], coord[1] + offset];
    });
  };

  // One flight's route and airports, drawn on each of the three world
  // copies.
  const renderRoute = (flight, weight, renderer) => {
    const greatCirclePath = getGreatCirclePath(
      flight.departure_coordinates,
      flight.arrival_coordinates,
    );

    // We split the path to prevent visual artifacts
    const pathSegments = splitPathAtAntimeridian(greatCirclePath);

    let flightColor = "#C91A25";
    const departureDate = parseToDate(flight.departure_date);
    const now = new Date();
    if (departureDate && departureDate > now) {
      flightColor = "#7B2EDA";
    }

    // We render 3 copies: Main, Left World (-360), Right World (+360)
    const offsets = [0, 360, -360];

    return (
      <React.Fragment key={flight.id}>
        {offsets.map((offset) => (
          <React.Fragment key={offset}>
            {/* Render Lines */}
            {pathSegments.map((segment, i) => (
              <Polyline
                key={`line-${i}-${offset}`}
                positions={shiftCoords(segment, offset)}
                color={flightColor}
                weight={weight}
                renderer={renderer}
              />
            ))}

            {/* Render Markers (Departure) */}
            <CircleMarker
              center={[
                flight.departure_coordinates[0],
                flight.departure_coordinates[1] + offset,
              ]}
              radius={3}
              color={flightColor}
              fillColor={flightColor}
              fillOpacity={1}
              renderer={renderer}
            />

            {/* Render Markers (Arrival) */}
            <CircleMarker
              center={[
                flight.arrival_coordinates[0],
                flight.arrival_coordinates[1] + offset,
              ]}
              radius={3}
              color={flightColor}
              fillColor={flightColor}
              fillOpacity={1}
              renderer={renderer}
            />
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  };

  return (
    <MapContainer
      center={center}
      zoom={2}
      minZoom={2}
      style={{
        height,
        width: "100%",
        // Leaflet's default container background (#ddd) shows through tiles
        // that failed or haven't loaded yet, which looks like light grey
        // squares among the dark tiles.
        background:
          computedColorScheme === "dark"
            ? "var(--mantine-color-dark-6)"
            : undefined,
      }}
      worldCopyJump={true} // Keep this for smooth navigation
      attributionControl={false}
    >
      {/* Top right, because at the bottom the Stats sheet slides over the
          credit and leaves a stray white corner next to the expand button. */}
      <AttributionControl position="topright" />
      <FitMapToBounds bounds={bounds} />
      {/* keepBuffer keeps loaded tiles around the view (Leaflet's default is
          2 rings), so panning back over an area shows it at once. */}
      <TileLayer
        key={computedColorScheme}
        url={tileUrl}
        attribution={attribution}
        detectRetina
        keepBuffer={4}
      />
      {isDark && <TileLayer url={labelsUrl} keepBuffer={4} />}

      {/* With a filter on, the other routes sit underneath in their own pane.
          The pane is faded as a whole, so routes flown many times don't stack
          up into solid lines. */}
      {filtering && (
        // No canvas renderer here: a canvas ignores the pane, so the
        // pane's opacity would not fade these routes.
        <Pane name="faded-routes" style={{ zIndex: 390, opacity: 0.15 }}>
          {fadedFlights
            .filter(isValidFlight)
            .map((flight) => renderRoute(flight, 1))}
        </Pane>
      )}
      {filteredFlights
        .filter(isValidFlight)
        .map((flight) => renderRoute(flight, filtering ? 2 : 1, renderer))}
    </MapContainer>
  );
};

export default WorldMap;
