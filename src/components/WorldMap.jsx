import React from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Example flight paths: each is an array of [lat, lng] pairs
const exampleFlights = [
  [
    [40.7128, -74.0060], // New York
    [51.5074, -0.1278],  // London
    [35.6895, 139.6917], // Tokyo
  ],
  [
    [34.0522, -118.2437], // Los Angeles
    [25.276987, 55.296249], // Dubai
  ],
];

const WorldMap = ({ flights = exampleFlights }) => (
  <MapContainer center={[20, 0]} zoom={1} style={{ height: "200px", width: "100vw" }}>
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; OpenStreetMap contributors"
    />
    {flights.map((path, idx) => (
      <Polyline key={idx} positions={path} color="blue" />
    ))}
  </MapContainer>
);

export default WorldMap;

