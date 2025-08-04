import React from "react";
import { NativeSelect } from "@mantine/core";
import useFlightStore from "../store";
import flightsData from "../../python/flights_with_coordinates.json";

const FlightYearFilter = () => {
  const { selectedYear, setSelectedYear } = useFlightStore();

  // Only consider past flights for year options
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastFlights = flightsData.filter(
    (flight) => new Date(flight.date) <= today,
  );

  const years = [
    ...new Set(
      pastFlights.map((flight) => new Date(flight.date).getFullYear()),
    ),
  ].sort((a, b) => b - a);

  return (
    <NativeSelect
      value={selectedYear}
      onChange={(e) => setSelectedYear(e.target.value)}
      mt="md"
      mb="xs"
      id="flight-year-filter"
      data={[
        { value: "all", label: "All Past Flights" },
        { value: "upcoming", label: "Upcoming Flights" },
        ...years.map((year) => ({
          value: String(year),
          label: String(year),
        })),
      ]}
    />
  );
};

export default FlightYearFilter;
