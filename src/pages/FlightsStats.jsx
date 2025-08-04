import React, { useEffect } from "react";
import WorldMap from "../components/WorldMap.jsx";
import {
  Title,
  Stack,
  Card,
  Grid,
  SegmentedControl,
  Paper,
} from "@mantine/core";
import StatsSummary from "../components/StatsSummary.jsx";
import useFlightStore from "../store.js";
import { BarChart } from "@mantine/charts";
import FlightCard from "../components/FlightCard";
import DistanceStatsCard from "../components/DistanceStatsCard";
import {
  getDeparturesByCountry,
  getFlightsByTimeGrouping,
} from "../utils/chartUtils.js";
import { getFilteredFlights } from "../utils/flightUtils.js";
import flightsData from "../../python/flights_with_coordinates.json";
import { useFlightStats } from "../hooks/useFlightStats.js";

const FlightsStats = () => {
  const { selectedYear, userName, setUserName } = useFlightStore();
  const [timeGrouping, setTimeGrouping] = React.useState("dayOfWeek");

  /** @type {import('../types').Flight[]} */
  const allFlights = flightsData;
  const filteredFlights = getFilteredFlights(allFlights, selectedYear);

  const chartData = getDeparturesByCountry(filteredFlights);
  const timeChartData = getFlightsByTimeGrouping(filteredFlights, timeGrouping);

  const stats = useFlightStats(filteredFlights);

  useEffect(() => {
    // Set the username from context when the component mounts
    setUserName("Federico");
  }, [setUserName]);

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 0 }}>
        <WorldMap />
      </div>

      {/* This Stack will scroll over the map */}
      <Paper radius="lg" p="md" style={{ position: "relative", zIndex: 1 }}>
        <Stack
          bg="var(--mantine-color-body)"
          gap="md"
          px="md"
          style={{ position: "relative", zIndex: 1 }}
        >
          <Title order={4} align="center" mt="md">
            {userName ? `Welcome ${userName}` : "Welcome to My Flight Tracker"}
          </Title>
          <StatsSummary />
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
      </Paper>
    </>
  );
};

export default FlightsStats;
