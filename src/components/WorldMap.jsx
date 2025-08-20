import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import LatLon from "geodesy/latlon-spherical.js";
import useFlightStore from "../store.ts";

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
  const coords = flights.flatMap((f) => [
    f.departure_coordinates,
    f.arrival_coordinates,
  ]);
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
 * Calculate bounds for all coordinates.
 * @param {Array} flights - Array of flight objects
 * @returns {[[number, number], [number, number]]} [[southWest], [northEast]]
 */
const getFlightsBounds = (flights) => {
  const coords = flights.flatMap((f) => [
    f.departure_coordinates,
    f.arrival_coordinates,
  ]);
  if (!coords.length)
    return [
      [-90, -180],
      [90, 180],
    ];
  const lats = coords.map((c) => c[0]);
  const lons = coords.map((c) => c[1]);

  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);

  // Handle longitudes with wrap-around if span > 180°
  let lonMin = Math.min(...lons);
  let lonMax = Math.max(...lons);
  if (lonMax - lonMin > 180) {
    const shifted = lons.map((lon) => (lon < 0 ? lon + 360 : lon));
    lonMin = Math.min(...shifted);
    lonMax = Math.max(...shifted);
    // Map back to [-180, 180]
    lonMin = lonMin > 180 ? lonMin - 360 : lonMin;
    lonMax = lonMax > 180 ? lonMax - 360 : lonMax;
    if (lonMax < lonMin) [lonMin, lonMax] = [lonMax, lonMin];
  }
  return [
    [latMin, lonMin],
    [latMax, lonMax],
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
  const { filteredFlights, selectedYear } = useFlightStore();
  const center = useMemo(
    () => getFlightsCentroid(filteredFlights),
    [filteredFlights],
  );
  const bounds = useMemo(
    () => getFlightsBounds(filteredFlights),
    [filteredFlights],
  );
  const flightColor = selectedYear === "upcoming" ? "red" : "blue";

  return (
    <MapContainer
      center={center}
      zoom={2}
      minZoom={2}
      style={{ height: "400px", width: "100%" }}
      maxBounds={[
        [-90, -180],
        [90, 180],
      ]}
      worldCopyJump={true}
    >
      <FitMapToBounds bounds={bounds} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        noWrap={true}
      />
      {filteredFlights.map((flight, idx) => {
        const greatCirclePath = getGreatCirclePath(
          flight.departure_coordinates,
          flight.arrival_coordinates,
        );
        const pathSegments = splitPathAtAntimeridian(greatCirclePath);

        return (
          <React.Fragment key={`${idx}-${flightColor}`}>
            {pathSegments.map((segment, segmentIdx) => (
              <Polyline
                key={segmentIdx}
                positions={segment}
                color={flightColor}
                weight={2}
              />
            ))}
            <CircleMarker
              center={flight.departure_coordinates}
              radius={3}
              color={flightColor}
              fillColor={flightColor}
              fillOpacity={1}
            />
            <CircleMarker
              center={flight.arrival_coordinates}
              radius={3}
              color={flightColor}
              fillColor={flightColor}
              fillOpacity={1}
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};

export default WorldMap;
