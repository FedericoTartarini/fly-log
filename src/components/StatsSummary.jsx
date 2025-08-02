import React, { useState } from "react";
import flightsData from "../../python/flights_with_coordinates.json";

const StatsSummary = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison

  // Filter out future flights
  const pastFlights = flightsData.filter(
    (flight) => new Date(flight.Date) <= today,
  );

  // Get unique years from past flights for the dropdown
  const years = [
    ...new Set(
      pastFlights.map((flight) => new Date(flight.Date).getFullYear()),
    ),
  ].sort((a, b) => b - a); // Sort years in descending order

  const [selectedYear, setSelectedYear] = useState("all");

  // Filter flights based on the selected year
  const filteredFlights =
    selectedYear === "all"
      ? pastFlights
      : pastFlights.filter(
          (flight) =>
            new Date(flight.Date).getFullYear().toString() === selectedYear,
        );

  // Calculate total number of flights
  const totalFlights = filteredFlights.length;

  // Calculate total distance and flight time
  const { totalDistance, totalFlightTime } = filteredFlights.reduce(
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

  filteredFlights.forEach((flight) => {
    if (flight.From) airports.add(flight.From);
    if (flight.To) airports.add(flight.To);
    if (flight.Airline) airlines.add(flight.Airline);
  });

  const cardStyle = {
    padding: "1rem",
    margin: "1rem",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
  };

  const summaryStyle = {
    display: "flex",
    justifyContent: "space-around",
    flexWrap: "wrap",
    marginTop: "1rem",
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

  const dropdownStyle = {
    width: "100%",
    padding: "0.5rem",
    marginBottom: "1rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
  };

  return (
    <div style={cardStyle}>
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        style={dropdownStyle}
      >
        <option value="all">All Stats</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
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
    </div>
  );
};

export default StatsSummary;
