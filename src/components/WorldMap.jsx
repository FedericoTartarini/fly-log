import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useComputedColorScheme } from "@mantine/core";
import LatLon from "geodesy/latlon-spherical.js";
import useFlightStore from "../store.ts";
import { parseToDate } from "../utils/dateUtils";

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
    .flatMap((f) => [
      f.departure_coordinates,
      f.arrival_coordinates,
    ])
    .filter(
      (coord) =>
        Array.isArray(coord) &&
        coord.length === 2 &&
        coord.every((n) => typeof n === "number" && isFinite(n)),
    );
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
    .flatMap((f) => [
      f.departure_coordinates,
      f.arrival_coordinates,
    ])
    .filter(
      (coord) =>
        Array.isArray(coord) &&
        coord.length === 2 &&
        coord.every((n) => typeof n === "number" && isFinite(n)),
    );

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

const WorldMap = () => {
  const { filteredFlights } = useFlightStore();
  const computedColorScheme = useComputedColorScheme("light");

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

  // Current Carto (has gray borders)
  // const tileUrl = `https://{s}.basemaps.cartocdn.com/${computedColorScheme === "dark" ? "dark" : "light"}_all/{z}/{x}/{y}.png`;

  // Try this: Esri World Terrain (Clean, physical look, no borders)
  // Note: This does not automatically support dark mode efficiently,
  // so you might need a different URL for dark mode or use CSS filters.
  const tileUrl =
    computedColorScheme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png" // Carto Dark without text (borders are very faint)
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}"; // Esri Terrain (Very clean, no borders)

  // Helper to shift coordinates for ghost copies
  const shiftCoords = (coords, offset) => {
    return coords.map((coord) => {
      // Handle simple [lat, lon] or array of arrays [[lat, lon], ...]
      if (Array.isArray(coord[0])) return shiftCoords(coord, offset);
      return [coord[0], coord[1] + offset];
    });
  };

  return (
    <MapContainer
      center={center}
      zoom={2}
      minZoom={2}
      style={{ height: "60vh", width: "100%" }}
      worldCopyJump={true} // Keep this for smooth navigation
    >
      <FitMapToBounds bounds={bounds} />
      <TileLayer
        key={computedColorScheme}
        url={tileUrl}
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />

      {filteredFlights.map((flight) => {
        const greatCirclePath = getGreatCirclePath(
          flight.departure_coordinates,
          flight.arrival_coordinates,
        );

        // We split the path to prevent visual artifacts
        const pathSegments = splitPathAtAntimeridian(greatCirclePath);

        let flightColor = "#5d41b0";
        const departureDate = parseToDate(flight.departure_date);
        const now = new Date();
        if (departureDate && departureDate > now) {
          flightColor = "#d80818";
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
                    weight={2}
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
                />
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};

export default WorldMap;
