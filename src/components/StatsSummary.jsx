import React from "react";
import flightsData from "../../python/flights_with_coordinates.json";
import useFlightStore from "../store";
import {
  NativeSelect,
  Card,
  Image,
  Text,
  Grid,
  Stack,
  Title,
} from "@mantine/core";
import flightImg from "../assets/flight.jpg";
import { getFilteredFlights } from "../utils/flightUtils.js";

const DisplayStatistics = ({ label, value }) => (
  <Stack align="center" justify="center" gap="0px">
    <Title order={1}>{value}</Title>
    <Text size="sm" c="dimmed">
      {label}
    </Text>
  </Stack>
);

const StatsSummary = () => {
  const { selectedYear, setSelectedYear } = useFlightStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison

  /** @type {import('../types').Flight[]} */
  const allFlights = flightsData;

  // Filter out future flights
  const pastFlights = allFlights.filter(
    (flight) => new Date(flight.Date) <= today,
  );

  // Get unique years from past flights for the dropdown
  const years = [
    ...new Set(
      pastFlights.map((flight) => new Date(flight.Date).getFullYear()),
    ),
  ].sort((a, b) => b - a); // Sort years in descending order

  const filteredFlights = getFilteredFlights(allFlights, selectedYear);

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
  const countries = new Set();

  filteredFlights.forEach((flight) => {
    if (flight.From) airports.add(flight.From);
    if (flight.To) airports.add(flight.To);
    if (flight.Airline) airlines.add(flight.Airline);
    if (flight.departure_country) countries.add(flight.departure_country);
    if (flight.arrival_country) countries.add(flight.arrival_country);
  });

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image src={flightImg} height={120} alt="plane wing" />
      </Card.Section>

      <NativeSelect
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        mt="md"
        mb="xs"
        data={[
          { value: "all", label: "All Stats" },
          { value: "upcoming", label: "Upcoming Flights" },
          ...years.map((year) => ({
            value: String(year),
            label: String(year),
          })),
        ]}
      />

      <Grid>
        <Grid.Col span={4}>
          <DisplayStatistics
            value={filteredFlights.length}
            label="Total Flights"
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <DisplayStatistics
            value={Math.round(totalDistance).toLocaleString()}
            label="Distance (km)"
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <DisplayStatistics
            value={(totalFlightTime / 24).toFixed(1)}
            label="Time (days)"
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <DisplayStatistics value={airports.size} label="Airports Visited" />
        </Grid.Col>
        <Grid.Col span={4}>
          <DisplayStatistics value={airlines.size} label="Airlines Flown" />
        </Grid.Col>
        <Grid.Col span={4}>
          <DisplayStatistics value={countries.size} label="Countries" />
        </Grid.Col>
      </Grid>
    </Card>
  );
};

export default StatsSummary;
