import React from "react";
import { Card, Grid, Group, Image, Title, Text, Stack } from "@mantine/core";
import { getFilteredFlights } from "../utils/flightUtils.js";
import { useFlightStats } from "../hooks/useFlightStats.js";
import FlightYearFilter from "./FlightYearFilter";
import useFlightStore from "../store";
import flightsData from "../../python/flights_with_coordinates.json";
import flightImg from "../assets/flight.jpg";
import { Ids } from "../constants/Ids.js";

const StatDisplay = ({ label, value, id }) => (
  <Stack align="center" justify="center" gap="xs">
    <Title order={2} id={id} ta="center">
      {value}
    </Title>
    <Text size="md" c="dimmed" ta="center">
      {label}
    </Text>
  </Stack>
);

function StatsSummary() {
  const { selectedYear } = useFlightStore();

  /** @type {import('../types').Flight[]} */
  const allFlights = flightsData;
  const filteredFlights = getFilteredFlights(allFlights, selectedYear);

  const stats = useFlightStats(filteredFlights);

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Card.Section>
        <Image src={flightImg} height={160} alt="plane wing" />
      </Card.Section>

      <FlightYearFilter />

      <Grid>
        <Grid.Col span={4}>
          <StatDisplay
            value={filteredFlights.length}
            label="Total Flights"
            id={Ids.STATS.TOTAL_FLIGHTS}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <StatDisplay
            value={Math.round(stats.totalDistance).toLocaleString()}
            label="Distance (km)"
            id={Ids.STATS.TOTAL_DISTANCE}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <StatDisplay
            value={(stats.totalFlightTime / 24).toFixed(1)}
            label="Flight Time (days)"
            id={Ids.STATS.TOTAL_TIME}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <StatDisplay
            value={stats.airports}
            label="Airports Visited"
            id={Ids.STATS.AIRPORTS_VISITED}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <StatDisplay
            value={stats.airlines}
            label="Airlines Flown"
            id={Ids.STATS.AIRLINES_FLOWN}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <StatDisplay
            value={stats.countries}
            label="Countries Visited"
            id={Ids.STATS.COUNTRIES_VISITED}
          />
        </Grid.Col>
      </Grid>
    </Card>
  );
}

export default StatsSummary;
