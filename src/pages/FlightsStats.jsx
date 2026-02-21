import React, { lazy, Suspense } from "react";
const WorldMap = lazy(() => import("../components/WorldMap.jsx"));
const FlightsByChart = lazy(() => import("../components/FlightsByChart.jsx"));
const FlightsTopBar = lazy(() => import("../components/FlightsTopBar.jsx"));
import {
  Stack,
  Grid,
  Paper,
  Container,
  Loader,
  Text,
  Center,
  Card,
  Title,
} from "@mantine/core";
import StatsSummary from "../components/StatsSummary.jsx";
import useFlightStore from "../store.ts";
import FlightCard from "../components/FlightCard.tsx";
import DistanceStatsCard from "../components/DistanceStatsCard.js";
import { getFlightsByTimeGrouping } from "../utils/chartUtils.js";
import { useFlightStats } from "../hooks/useFlightStats.js";
import { useTranslation } from "react-i18next";
import FlightFilters from "../components/FlightFilters.tsx";

const FlightsStats = () => {
  const filteredFlights = useFlightStore((s) => s.filteredFlights);
  const isLoading = useFlightStore((s) => s.isLoading);
  const error = useFlightStore((s) => s.error);
  const allFlights = useFlightStore((s) => s.allFlights);
  const timeGrouping = useFlightStore((s) => s.timeGrouping);

  // Move the stats calculation here to avoid conditional hook calls
  const stats = useFlightStats(filteredFlights);

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
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <FlightsTopBar fullWidth={true} />
      </Suspense>
    );
  }

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 0 }}>
        <Suspense
          fallback={
            <Center h={200}>
              <Loader />
            </Center>
          }
        >
          <WorldMap />
        </Suspense>
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

          <Card shadow="sm" radius="md" withBorder>
            <Title order={3} mb="md">
              {t("filters.title")}
            </Title>
            <FlightFilters />
          </Card>

          {/* Add button to open modal */}
          <Suspense fallback={<div>Loading...</div>}>
            <FlightsTopBar fullWidth={true} />
          </Suspense>

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

          <Suspense
            fallback={
              <Center h={100}>
                <Loader />
              </Center>
            }
          >
            <FlightsByChart
              data={timeChartData}
              height={(timeChartData.length + 1) * 28}
            />
          </Suspense>

          <Suspense
            fallback={
              <Center h={100}>
                <Loader />
              </Center>
            }
          >
            <FlightsByChart filteredFlights={filteredFlights} />
          </Suspense>
        </Stack>
      </Paper>
    </>
  );
};

export default FlightsStats;
