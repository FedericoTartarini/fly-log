import React, { useEffect, useState } from "react";
import WorldMap from "../components/WorldMap.jsx";
import {
  Stack,
  Card,
  Grid,
  Paper,
  Container,
  Loader,
  Text,
  Center,
} from "@mantine/core";
import StatsSummary from "../components/StatsSummary.jsx";
import useFlightStore from "../store.ts";
import FlightCard from "../components/FlightCard.tsx";
import DistanceStatsCard from "../components/DistanceStatsCard.js";
import { getFlightsByTimeGrouping } from "../utils/chartUtils.js";
import { useFlightStats } from "../hooks/useFlightStats.js";
import { useTranslation } from "react-i18next";
import FlightsTopBar from "../components/FlightsTopBar.jsx";
import FlightsByChart from "../components/FlightsByChart.jsx";

const FlightsStats = () => {
  const { filteredFlights, isLoading, error, fetchFlights, allFlights } =
    useFlightStore();
  const [timeGrouping, setTimeGrouping] = useState("dayOfWeek");

  // Move the stats calculation here to avoid conditional hook calls
  const stats = useFlightStats(filteredFlights);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  // Prepare chart data outside of the conditional rendering
  const timeChartData = getFlightsByTimeGrouping(filteredFlights, timeGrouping);

  const { t } = useTranslation("flights");

  if (isLoading) {
    return (
      <Container size="lg" mt="md">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" mt="md">
        <Text c="red" size="lg" ta="center">
          Error loading flight data: {error}
        </Text>
      </Container>
    );
  }

  if (allFlights.length === 0) {
    return <FlightsTopBar fullWidth={true} />;
  }

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 0 }}>
        <WorldMap />
      </div>

      {/* This Stack will scroll over the map */}
      <Paper radius="lg" pt="xs" style={{ position: "relative", zIndex: 1 }}>
        <Stack
          bg="var(--mantine-color-body)"
          gap="md"
          px="md"
          style={{ position: "relative", zIndex: 1 }}
        >
          <StatsSummary />

          {/* Add button to open modal */}
          <FlightsTopBar fullWidth={true} />

          <DistanceStatsCard
            totalDistance={stats.totalDistance}
            totalFlights={filteredFlights.length}
          />

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <FlightCard
                flight={stats.shortestFlight}
                title={t("stats.shortest_flight")}
                color="orange"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <FlightCard
                flight={stats.longestFlight}
                title={t("stats.longest_flight")}
                color="teal"
              />
            </Grid.Col>
          </Grid>

          <FlightsByChart
            data={timeChartData}
            timeGrouping={timeGrouping}
            height={(timeChartData.length + 1) * 28}
            onTimeGroupingChange={setTimeGrouping}
          />

          <FlightsByChart filteredFlights={filteredFlights} />
        </Stack>
      </Paper>
    </>
  );
};

export default FlightsStats;
