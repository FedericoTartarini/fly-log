import React from "react";
import flightsData from "../../python/flights_with_coordinates.json";

const StatsSummary = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison

  // Filter out future flights
  const pastFlights = flightsData.filter(
    (flight) => new Date(flight.Date) <= today,
  );

  // Calculate total number of flights
  const totalFlights = pastFlights.length;

  // Calculate total distance and flight time
  const { totalDistance, totalFlightTime } = pastFlights.reduce(
    (acc, flight) => {
      acc.totalDistance += flight.distance_km || 0;
      acc.totalFlightTime += flight.flight_time || 0;
      return acc;
    },
    { totalDistance: 0, totalFlightTime: 0 },
  );

  // Calculate unique airports and airlines
  const airports = new Set();
  const airlines = new Set();

  pastFlights.forEach((flight) => {
    if (flight.From) airports.add(flight.From);
    if (flight.To) airports.add(flight.To);
    if (flight.Airline) airlines.add(flight.Airline);
  });

  const summaryStyle = {
    padding: "1rem",
    margin: "1rem",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-around",
    flexWrap: "wrap",
  };

  const statItemStyle = {
    textAlign: "center",
    margin: "0.5rem 1rem",
  };

  const statValueStyle = {
    fontSize: "1.5rem",
    fontWeight: "bold",
  };

  const statLabelStyle = {
    fontSize: "0.9rem",
    color: "#555",
  };

  return (
    <div style={summaryStyle}>
      <div style={statItemStyle}>
        <div style={statValueStyle}>{totalFlights}</div>
        <div style={statLabelStyle}>Total Flights</div>
      </div>
      <div style={statItemStyle}>
        <div style={statValueStyle}>
          {Math.round(totalDistance).toLocaleString()}
        </div>
        <div style={statLabelStyle}>Total Distance (km)</div>
      </div>
      <div style={statItemStyle}>
        <div style={statValueStyle}>{(totalFlightTime / 24).toFixed(1)}</div>
        <div style={statLabelStyle}>Total Flight Time (days)</div>
      </div>
      <div style={statItemStyle}>
        <div style={statValueStyle}>{airports.size}</div>
        <div style={statLabelStyle}>Airports Visited</div>
      </div>
      <div style={statItemStyle}>
        <div style={statValueStyle}>{airlines.size}</div>
        <div style={statLabelStyle}>Airlines Flown</div>
      </div>
    </div>
  );
};

export default StatsSummary;
