import React from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import flightsData from "../../python/flights_with_coordinates.json";
import LatLon from "geodesy/latlon-spherical.js";
import useFlightStore from "../store";

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

const WorldMap = () => {
  const { selectedYear } = useFlightStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastFlights = flightsData.filter(
    (flight) => new Date(flight.Date) <= today,
  );

  const filteredFlights =
    selectedYear === "all"
      ? pastFlights
      : pastFlights.filter(
          (flight) =>
            new Date(flight.Date).getFullYear().toString() === selectedYear,
        );

  const flightPaths = filteredFlights.flatMap((flight) => {
    const greatCirclePath = getGreatCirclePath(
      flight.departure_coordinates,
      flight.arrival_coordinates,
    );
    return splitPathAtAntimeridian(greatCirclePath);
  });

  return (
    <MapContainer
      center={[20, 151]}
      zoom={2}
      minZoom={2}
      style={{ height: "500px", width: "100vw" }}
      maxBounds={[
        [-90, -180],
        [90, 180],
      ]}
      worldCopyJump={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        noWrap={true}
      />
      {flightPaths.map((path, idx) => {
        const crossesAntimeridian =
          Math.abs(path[0][1] - path[path.length - 1][1]) > 180;

        if (crossesAntimeridian) {
          const shift = path[0][1] > 0 ? -360 : 360;
          const shiftedPath = path.map(([lat, lon]) => [lat, lon + shift]);

          return (
            <React.Fragment key={idx}>
              <Polyline positions={path} color="blue" />
              <Polyline positions={shiftedPath} color="blue" />
            </React.Fragment>
          );
        }

        return <Polyline key={idx} positions={path} color="blue" />;
      })}
    </MapContainer>
  );
};

export default WorldMap;
