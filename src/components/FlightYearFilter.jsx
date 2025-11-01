import React from "react";
import { NativeSelect } from "@mantine/core";
import useFlightStore from "../store.ts";
import { parseToDate } from "../utils/dateUtils";

const FlightYearFilter = () => {
  const { selectedYear, setSelectedYear, allFlights } = useFlightStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only consider past flights for year options
  const yearsSet = new Set();
  allFlights.forEach((flight) => {
    const dt = parseToDate(flight.departure_date);
    if (!dt) return;
    yearsSet.add(dt.getFullYear());
  });

  const years = Array.from(yearsSet).sort((a, b) => b - a);

  return (
    <NativeSelect
      value={selectedYear}
      onChange={(e) => setSelectedYear(e.target.value)}
      mt="md"
      mb="xs"
      id="flight-year-filter"
      label="Fliter flights"
      data={[
        { value: "all", label: "All Flights" },
        { value: "upcoming", label: "Upcoming Flights" },
        { value: "past", label: "Past Flights" },
        ...years.map((year) => ({
          value: String(year),
          label: String(year),
        })),
      ]}
    />
  );
};

export default FlightYearFilter;
