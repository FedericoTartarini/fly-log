import React from "react";
import { Card, Grid, Group, Image, Button } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useFlightStats } from "../hooks/useFlightStats.js";
import FlightYearFilter from "./FlightYearFilter";
import useFlightStore from "../store.ts";
import flightImg from "../assets/flight.jpg";
import { Paths, Ids } from "../constants/MyClasses.js";
import StatDisplay from "./StatDisplay";

function StatsSummary() {
  const { filteredFlights } = useFlightStore();
  const navigate = useNavigate();

  // Use the enhanced flight stats with our enriched flight data
  const stats = useFlightStats(filteredFlights);

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Card.Section>
        <Image src={flightImg} height={160} alt="plane wing" />
      </Card.Section>

      <FlightYearFilter />

      <Grid>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={filteredFlights.length}
            label="Total Flights"
            id={Ids.STATS.TOTAL_FLIGHTS}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={Math.round(stats.totalDistance).toLocaleString()}
            label="Distance (km)"
            id={Ids.STATS.TOTAL_DISTANCE}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={(stats.totalFlightTime / 24).toFixed(1)}
            label="Flight Time (days)"
            id={Ids.STATS.TOTAL_TIME}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={stats.airports}
            label="Airports Visited"
            id={Ids.STATS.AIRPORTS_VISITED}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={stats.airlines}
            label="Airlines Flown"
            id={Ids.STATS.AIRLINES_FLOWN}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={stats.countries}
            label="Countries Visited"
            id={Ids.STATS.COUNTRIES_VISITED}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={stats.internationalFlights}
            label="International Flights"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={stats.longHaulFlights}
            label="Long Haul Flights"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, xs: 4 }}>
          <StatDisplay
            value={stats.westBoundFlights}
            label="West Bound Flights"
          />
        </Grid.Col>
      </Grid>

      <Group justify="center" mt="md">
        <Button variant="light" onClick={() => navigate(Paths.FLIGHTS)}>
          View Flights
        </Button>
      </Group>
    </Card>
  );
}

export default StatsSummary;
