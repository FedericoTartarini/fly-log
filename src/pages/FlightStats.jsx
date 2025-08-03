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
  SegmentedControl,
  Badge,
  Divider,
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
  const [timeGrouping, setTimeGrouping] = React.useState("dayOfWeek");

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
    if (flight.from) airports.add(flight.from);
    if (flight.to) airports.add(flight.to);
    if (flight.airline) airlines.add(flight.airline);
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

  // Calculate flights by time grouping
  const getFlightsByTimeGrouping = () => {
    const grouping = {};

    filteredFlights.forEach((flight) => {
      if (!flight.date) return;

      const date = new Date(flight.date);
      let key;

      switch (timeGrouping) {
        case "dayOfWeek":
          key = date.toLocaleDateString("en-US", { weekday: "long" });
          break;
        case "year":
          key = date.getFullYear().toString();
          break;
        case "month":
          key = date.toLocaleDateString("en-US", { month: "long" });
          break;
        default:
          key = "Unknown";
      }

      grouping[key] = (grouping[key] || 0) + 1;
    });

    // Define order for consistent display
    let order;
    switch (timeGrouping) {
      case "dayOfWeek":
        order = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        break;
      case "month":
        order = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        break;
      default:
        order = Object.keys(grouping).sort();
    }

    return order
      .filter((key) => grouping[key])
      .map((key) => ({
        period: key,
        flights: grouping[key] || 0,
      }));
  };

  const timeChartData = getFlightsByTimeGrouping();

  // Find shortest and longest flights
  const shortestFlight = filteredFlights.reduce(
    (shortest, flight) =>
      !shortest || flight.distance_km < shortest.distance_km
        ? flight
        : shortest,
    null,
  );

  const longestFlight = filteredFlights.reduce(
    (longest, flight) =>
      !longest || flight.distance_km > longest.distance_km ? flight : longest,
    null,
  );

  const FlightCard = ({ flight, title, color }) => {
    if (!flight) return null;

    return (
      <Card shadow="sm" radius="md" withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4} c={color}>
              {title}
            </Title>

            <Text size="sm">
              <Text span fw={500}>
                Airline:
              </Text>{" "}
              {flight.airline}
            </Text>
          </Group>

          <Group justify="space-between">
            <Text fw={500} size="lg">
              {flight.from} → {flight.to}
            </Text>
            <Badge color={color} variant="light">
              {Math.round(flight.distance_km).toLocaleString()} km
            </Badge>
          </Group>

          <Group justify="space-between">
            <Group gap="xs">
              <Badge size="sm" variant="outline">
                {flight.departure_country}
              </Badge>
              <Text size="xs" c="dimmed">
                to
              </Text>
              <Badge size="sm" variant="outline">
                {flight.arrival_country}
              </Badge>
            </Group>

            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {new Date(flight.date).toLocaleDateString()}
              </Text>
              <Text size="sm" c="dimmed">
                {flight.flight_time.toFixed(2)}h flight time
              </Text>
            </Group>
          </Group>

          {flight.aircraft_type_name && (
            <Text size="sm">
              <Text span fw={500}>
                Aircraft:
              </Text>{" "}
              {flight.aircraft_type_name}
            </Text>
          )}
        </Stack>
      </Card>
    );
  };

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

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <FlightCard
              flight={shortestFlight}
              title="Shortest Flight"
              color="orange"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <FlightCard
              flight={longestFlight}
              title="Longest Flight"
              color="teal"
            />
          </Grid.Col>
        </Grid>

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

        <Card shadow="sm" radius="md" withBorder>
          <Stack mb="md">
            <Title order={3}>
              Flights by{" "}
              {timeGrouping === "dayOfWeek"
                ? "Day of Week"
                : timeGrouping === "year"
                  ? "Year"
                  : "Month"}
            </Title>
            <SegmentedControl
              value={timeGrouping}
              onChange={setTimeGrouping}
              data={[
                { label: "Day of Week", value: "dayOfWeek" },
                { label: "Year", value: "year" },
                { label: "Month", value: "month" },
              ]}
            />
          </Stack>
          <BarChart
            h={(timeChartData.length + 1) * 27}
            data={timeChartData}
            dataKey="period"
            orientation={"vertical"}
            // orientation={timeGrouping === "year" ? "horizontal" : "vertical"}
            yAxisProps={{ width: 80 }}
            barProps={{ radius: 8 }}
            series={[{ name: "flights", color: "green.6" }]}
          />
        </Card>
      </Stack>
    </Container>
  );
}

export default FlightStats;
