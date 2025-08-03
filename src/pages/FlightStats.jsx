import React from "react";
import {
  Container,
  Title,
  Stack,
  Card,
  Grid,
  Image,
  SegmentedControl,
} from "@mantine/core";
import { BarChart } from "@mantine/charts";
import useFlightStore from "../store";
import flightsData from "../../python/flights_with_coordinates.json";
import FlightYearFilter from "../components/FlightYearFilter";
import StatDisplay from "../components/StatDisplay";
import FlightCard from "../components/FlightCard";
import DistanceStatsCard from "../components/DistanceStatsCard";
import { getFilteredFlights } from "../utils/flightUtils.js";
import {
  getDeparturesByCountry,
  getFlightsByTimeGrouping,
} from "../utils/chartUtils.js";
import { useFlightStats } from "../hooks/useFlightStats.js";
import { Ids } from "../constants/Ids.js";
import flightImg from "../assets/flight.jpg";

function FlightStats() {
  const { selectedYear } = useFlightStore();
  const [timeGrouping, setTimeGrouping] = React.useState("dayOfWeek");

  /** @type {import('../types').Flight[]} */
  const allFlights = flightsData;
  const filteredFlights = getFilteredFlights(allFlights, selectedYear);

  const stats = useFlightStats(filteredFlights);
  const chartData = getDeparturesByCountry(filteredFlights);
  const timeChartData = getFlightsByTimeGrouping(filteredFlights, timeGrouping);

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
                value={Math.round(stats.totalDistance).toLocaleString()}
                label="Distance (km)"
                id={`${Ids.STATS.TOTAL_DISTANCE}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={(stats.totalFlightTime / 24).toFixed(1)}
                label="Flight Time (days)"
                id={`${Ids.STATS.TOTAL_TIME}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={stats.airports}
                label="Airports Visited"
                id={`${Ids.STATS.AIRPORTS_VISITED}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={stats.airlines}
                label="Airlines Flown"
                id={`${Ids.STATS.AIRLINES_FLOWN}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={stats.countries}
                label="Countries Visited"
                id={`${Ids.STATS.COUNTRIES_VISITED}-page`}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={stats.internationalFlights}
                label="International Flights"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={stats.domesticFlights}
                label="Domestic Flights"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={stats.longHaulFlights}
                label="Long Haul Flights"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <StatDisplay
                value={stats.westBoundFlights}
                label="West Bound Flights"
              />
            </Grid.Col>
          </Grid>
        </Card>

        <DistanceStatsCard
          totalDistance={stats.totalDistance}
          totalFlights={filteredFlights.length}
        />

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <FlightCard
              flight={stats.shortestFlight}
              title="Shortest Flight"
              color="orange"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <FlightCard
              flight={stats.longestFlight}
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
            orientation="vertical"
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
