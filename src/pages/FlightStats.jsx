import React from "react";
import {
  Container,
  Title,
  Stack,
  Card,
  Grid,
  Text,
  Image,
  Group,
} from "@mantine/core";
import { BarChart } from "@mantine/charts";
import useFlightStore from "../store";
import flightsData from "../../python/flights_with_coordinates.json";
import FlightYearFilter from "../components/FlightYearFilter";
import { getFilteredFlights } from "../utils/flightUtils.js";
import { Ids } from "../constants/Ids.js";
import flightImg from "../assets/flight.jpg";

const StatDisplay = ({ label, value, id }) => (
  <Group align="center" gap="xs">
    <Title order={2} id={id} ta="center">
      {value}
    </Title>
    <Text size="md" c="dimmed" ta="center">
      {label}
    </Text>
  </Group>
);

function FlightStats() {
  const { selectedYear } = useFlightStore();

  /** @type {import('../types').Flight[]} */
  const allFlights = flightsData;
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

  // Calculate unique airports, airlines, and countries
  const airports = new Set();
  const airlines = new Set();
  const countries = new Set();
  const domesticFlights = filteredFlights.filter(
    (flight) => flight.departure_country === flight.arrival_country,
  );
  const internationalFlights = filteredFlights.filter(
    (flight) => flight.departure_country !== flight.arrival_country,
  );
  const longHaulFlights = filteredFlights.filter(
    (flight) => flight.distance_km >= 5000,
  );
  const westBoundFlights = filteredFlights.filter(
    (flight) => flight.departure_coordinates[1] > flight.arrival_coordinates[1],
  );

  filteredFlights.forEach((flight) => {
    if (flight.From) airports.add(flight.From);
    if (flight.To) airports.add(flight.To);
    if (flight.Airline) airlines.add(flight.Airline);
    if (flight.departure_country) countries.add(flight.departure_country);
    if (flight.arrival_country) countries.add(flight.arrival_country);
  });

  // Calculate departures by country for the bar chart
  const departuresByCountry = filteredFlights.reduce((acc, flight) => {
    const country = flight.departure_country;
    if (country) {
      acc[country] = (acc[country] || 0) + 1;
    }
    return acc;
  }, {});

  // Convert to array format for BarChart and sort by count
  const chartData = Object.entries(departuresByCountry)
    .map(([country, count]) => ({
      country,
      departures: count,
    }))
    .sort((a, b) => b.departures - a.departures);

  return (
    <Container size="lg" mt="md">
      <Stack spacing="xl">
        <Title order={2} ta="center">
          Detailed Flight Statistics
        </Title>

        <Card shadow="sm" radius="md" withBorder>
          <Card.Section>
            <Image src={flightImg} height={160} alt="plane wing" />
          </Card.Section>

          <FlightYearFilter />

          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={filteredFlights.length}
                label="Total Flights"
                id={`${Ids.STATS.TOTAL_FLIGHTS}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={Math.round(totalDistance).toLocaleString()}
                label="Distance (km)"
                id={`${Ids.STATS.TOTAL_DISTANCE}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={(totalFlightTime / 24).toFixed(1)}
                label="Flight Time (days)"
                id={`${Ids.STATS.TOTAL_TIME}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={airports.size}
                label="Airports Visited"
                id={`${Ids.STATS.AIRPORTS_VISITED}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={airlines.size}
                label="Airlines Flown"
                id={`${Ids.STATS.AIRLINES_FLOWN}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={countries.size}
                label="Countries Visited"
                id={`${Ids.STATS.COUNTRIES_VISITED}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={internationalFlights.length}
                label="International Flights"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={domesticFlights.length}
                label="Domestic Flights"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={longHaulFlights.length}
                label="Long Haul Flights"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={westBoundFlights.length}
                label="West Bound Flights"
              />
            </Grid.Col>
          </Grid>
        </Card>

        <Card shadow="sm" radius="md" withBorder>
          <Title order={3} mb="md">
            Departures by Country
          </Title>
          <BarChart
            h={(chartData.length + 1) * 27}
            data={chartData}
            dataKey="country"
            orientation="vertical"
            yAxisProps={{ width: 60 }}
            barProps={{ radius: 8 }}
            series={[{ name: "departures", color: "blue.6" }]}
          />
        </Card>
      </Stack>
    </Container>
  );
}

export default FlightStats;
