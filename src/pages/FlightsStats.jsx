import React, { lazy, Suspense, useState, useEffect } from "react";
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
  Modal,
  Button,
  Affix,
} from "@mantine/core";
import StatsSummary from "../components/StatsSummary.jsx";
import useFlightStore from "../store.ts";
import FlightCard from "../components/FlightCard.tsx";
import DistanceStatsCard from "../components/DistanceStatsCard.js";
import { getFlightsByTimeGrouping } from "../utils/chartUtils.js";
import { useFlightStats } from "../hooks/useFlightStats.js";
import { useTranslation } from "react-i18next";
import FlightFilters from "../components/FlightFilters.tsx";
import { useShallow } from "zustand/react/shallow";
import { motion } from "framer-motion";
import { IconChevronsUp } from "@tabler/icons-react";

const FlightsStats = () => {
  const { filteredFlights, isLoading, error, allFlights, timeGrouping } =
    useFlightStore(
      useShallow((s) => ({
        filteredFlights: s.filteredFlights,
        isLoading: s.isLoading,
        error: s.error,
        allFlights: s.allFlights,
        timeGrouping: s.timeGrouping,
      })),
    );

  // Move the stats calculation here to avoid conditional hook calls
  const stats = useFlightStats(filteredFlights);

  // Prepare chart data outside of the conditional rendering
  const timeChartData = getFlightsByTimeGrouping(filteredFlights, timeGrouping);

  const { t } = useTranslation("flights");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [animateChevron, setAnimateChevron] = useState(true);

  // Stop the chevron animation after 15 seconds to avoid distraction
  useEffect(() => {
    const id = setTimeout(() => setAnimateChevron(false), 15000);
    return () => clearTimeout(id);
  }, []);

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

      {/* Sticky filter button (Affix) that opens a modal with full filters. */}
      <Affix position={{ bottom: 16, left: 16 }}>
        <Button
          radius="xl"
          size="sm"
          variant="gradient"
          onClick={() => setFiltersOpen(true)}
        >
          {t("filters.title")}
        </Button>
      </Affix>

      <Modal
        opened={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("filters.title")}
        size="lg"
        overlayProps={{ blur: 3 }}
      >
        <FlightFilters />
      </Modal>

      {/* This Stack will scroll over the map */}
      <Paper radius="lg" pt="xs" style={{ position: "relative", zIndex: 1 }}>
        {/* Small animated chevron to indicate draggable content */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ y: -2 }}
            animate={animateChevron ? { y: [0, -6, 0] } : { y: -2 }}
            transition={
              animateChevron
                ? { repeat: Infinity, duration: 1.5 }
                : { duration: 0 }
            }
            aria-hidden
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconChevronsUp
              size={20}
              stroke={2}
              style={{ color: "var(--mantine-color-dimmed, #868e96)" }}
            />
          </motion.div>
        </div>
        <Stack
          bg="var(--mantine-color-body)"
          gap="md"
          px="md"
          style={{ position: "relative", zIndex: 1 }}
        >
          <StatsSummary />

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
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <FlightCard
                flight={stats.longestFlight}
                title={t("stats.longest_flight")}
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
