import React from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import flightsData from "../../python/flights_with_coordinates.json";
import LatLon from "geodesy/latlon-spherical.js";
import useFlightStore from "../store";
import { getFilteredFlights } from "../utils/flightUtils.js";

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

  /** @type {import('../types').Flight[]} */
  const allFlights = flightsData;
  const filteredFlights = getFilteredFlights(allFlights, selectedYear);

  const flightColor = selectedYear === "upcoming" ? "red" : "blue";

  return (
    <MapContainer
      center={[20, 151]}
      zoom={2}
      minZoom={2}
      style={{ height: "500px", width: "100%" }}
      maxBounds={[
        [-90, -180],
        [90, 180],
      ]}
      worldCopyJump={true}
    >
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
