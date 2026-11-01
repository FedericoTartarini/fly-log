import React, { lazy, Suspense, useState, useMemo } from "react";
const WorldMap = lazy(() => import("../components/WorldMap.jsx"));
const FlightsByChart = lazy(() => import("../components/FlightsByChart.jsx"));
const NoFlightsCard = lazy(() => import("../components/NoFlightsCard.jsx"));
import {
  ActionIcon,
  Container,
  Skeleton,
  Text,
  Modal,
  VisuallyHidden,
} from "@mantine/core";
import { useHeadroom } from "@mantine/hooks";
import { IconMaximize } from "@tabler/icons-react";
import useFlightStore from "../store.ts";
import FlightCard from "../components/FlightCard.tsx";
import BoardingPass from "../components/BoardingPass.jsx";
import BadgeStrip from "../components/BadgeStrip.jsx";
import { getFlightsByTimeGrouping } from "../utils/chartUtils.js";
import { useFlightStats } from "../hooks/useFlightStats.js";
import { useTranslation } from "react-i18next";
import PageSkeleton from "../components/PageSkeleton.jsx";
import { useShallow } from "zustand/react/shallow";
import classes from "./FlightsStats.module.css";

// Stats dashboard: the map, with the boarding pass, records, badges and charts
// sliding up over it.
const FlightsStats = () => {
  const {
    filteredFlights,
    isLoading,
    error,
    allFlights,
    timeGrouping,
    chartMetric,
  } = useFlightStore(
    useShallow((s) => ({
      filteredFlights: s.filteredFlights,
      isLoading: s.isLoading,
      error: s.error,
      allFlights: s.allFlights,
      timeGrouping: s.timeGrouping,
      chartMetric: s.chartMetric,
    })),
  );

  // Calculate stats before conditional rendering to avoid hook ordering issues.
  const stats = useFlightStats(filteredFlights);

  // Prepare chart data outside conditional rendering. Memoised because it
  // walks every flight and is otherwise redone on each unrelated re-render.
  const timeChartData = useMemo(
    () => getFlightsByTimeGrouping(filteredFlights, timeGrouping, chartMetric),
    [filteredFlights, timeGrouping, chartMetric],
  );

  const { t } = useTranslation("flights");

  const [mapOpen, setMapOpen] = useState(false);
  // Same settings as the app shell's header, so the map moves up exactly
  // when the header hides.
  const headerPinned = useHeadroom({ fixedAt: 120 });

  if (isLoading) {
    return <PageSkeleton />;
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
      <Suspense fallback={<Skeleton height={36} radius="xl" />}>
        <NoFlightsCard />
      </Suspense>
    );
  }

  return (
    <div className={classes.page}>
      <VisuallyHidden component="h1">{t("stats.page_title")}</VisuallyHidden>

      <div
        className={classes.map}
        style={{ top: headerPinned ? "var(--app-shell-header-height)" : 0 }}
      >
        <Suspense fallback={<Skeleton height="100%" radius={0} />}>
          <WorldMap height="100%" />
        </Suspense>
        <ActionIcon
          variant="default"
          size={44}
          className={classes.mapButton}
          aria-label={t("stats.open_map")}
          onClick={() => setMapOpen(true)}
        >
          <IconMaximize size={20} aria-hidden />
        </ActionIcon>
      </div>

      <div className={classes.sheet}>
        <div aria-hidden className={classes.handle} />

        <BoardingPass />

        <div className={classes.columns}>
          <div className={classes.records}>
            <FlightCard
              flight={stats.longestFlight}
              title={t("stats.longest_flight")}
            />
            <FlightCard
              flight={stats.shortestFlight}
              title={t("stats.shortest_flight")}
            />
          </div>
          <BadgeStrip />
        </div>

        <div className={classes.columns}>
          <Suspense fallback={<Skeleton height={320} radius="md" />}>
            <FlightsByChart data={timeChartData} />
          </Suspense>
          <Suspense fallback={<Skeleton height={320} radius="md" />}>
            <FlightsByChart filteredFlights={filteredFlights} />
          </Suspense>
        </div>
      </div>

      <Modal
        opened={mapOpen}
        onClose={() => setMapOpen(false)}
        title={t("stats.map_title")}
        fullScreen
      >
        <Suspense fallback={<Skeleton height="80dvh" radius={0} />}>
          <WorldMap height="calc(100dvh - 80px)" />
        </Suspense>
      </Modal>
    </div>
  );
};

export default FlightsStats;
