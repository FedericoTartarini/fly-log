import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Affix,
  Anchor,
  Button,
  Container,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconBuildingAirport,
  IconChartLine,
  IconChevronLeft,
  IconClock,
  IconFlag,
  IconHourglass,
  IconLeaf,
  IconMap,
  IconPlane,
  IconRoute,
  IconTicket,
  IconWorld,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store.ts";
import { useFlightStats } from "../hooks/useFlightStats.js";
import { DISTANCE_TO_MOON, EARTH_CIRCUMFERENCE } from "../constants/distances";
import { IDS, PATHS } from "../constants/MyClasses.ts";
import FlightFilters from "../components/FlightFilters.tsx";
import PageSkeleton from "../components/PageSkeleton.jsx";
import classes from "./AllStats.module.css";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Goes from 0 to 1 once `ready` turns true, so the numbers count up the first
// time the page shows. Filter changes later apply at once.
const useCountUp = (ready, duration = 900) => {
  const [progress, setProgress] = useState(() => (reducedMotion() ? 1 : 0));

  useEffect(() => {
    if (!ready) return;
    if (reducedMotion()) {
      setProgress(1);
      return;
    }
    const start = performance.now();
    let frame;
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setProgress(1 - (1 - t) ** 3); // ease out
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [ready, duration]);

  return progress;
};

const StatCard = ({ icon, label, value, main, id }) => {
  const Icon = icon;
  return (
    <Paper radius={12} px={12} pt={10} pb={12} className={classes.card}>
      <Stack gap={6}>
        <Text
          fz={14}
          c="var(--fl-muted)"
          lh={1.25}
          data-cy={id && `${id}-label`}
        >
          {label}
        </Text>
        <div className={classes.value}>
          <ThemeIcon
            size={34}
            radius="xl"
            color={main ? "var(--fl-accent-tint)" : "var(--fl-subtle)"}
            c={main ? "var(--fl-accent-text)" : "var(--fl-ink)"}
            aria-hidden
          >
            <Icon size={19} stroke={1.8} />
          </ThemeIcon>
          <span className={classes.number} data-cy={id && `${id}-value`}>
            {value}
          </span>
        </div>
      </Stack>
    </Paper>
  );
};

// One "How far" bar: the fill is progress towards the next lap or trip, and
// the number inside counts the completed ones. On first view, one sweep
// stands for the completed laps, then the fill grows to the current one.
const JourneyBar = ({ label, ratio, next, aria }) => {
  const done = Math.floor(ratio);
  const percent = Math.floor((ratio - done) * 100);
  // Decided on first view only, so a later filter change never replays it.
  const [sweep] = useState(done > 0);
  return (
    <Stack gap={6}>
      <Text fw={500}>{label}</Text>
      <div
        role="progressbar"
        aria-label={aria(done + 1)}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className={classes.track}
      >
        {sweep && <div className={classes.sweep} />}
        <div
          className={`${classes.fill} ${sweep ? classes.afterSweep : ""}`}
          style={{ width: `${percent}%` }}
        />
        <span className={classes.times}>{done}×</span>
      </div>
      <Text fz={14} c="var(--fl-muted)">
        {next(percent, done + 1)}
      </Text>
    </Stack>
  );
};

// Every statistic for the filtered flights, opened from the boarding pass.
const AllStats = () => {
  const { filteredFlights, isLoading, error } = useFlightStore(
    useShallow((s) => ({
      filteredFlights: s.filteredFlights,
      isLoading: s.isLoading,
      error: s.error,
    })),
  );
  const stats = useFlightStats(filteredFlights);
  const progress = useCountUp(!isLoading);
  const { t, i18n } = useTranslation("flights");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The router keeps the Stats page's scroll position, which would open this
  // page partway down. Braces matter: Chrome's scrollTo returns a promise,
  // and React would call it as the effect's cleanup on unmount.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const count = (value, digits = 0) =>
    (value * progress).toLocaleString(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  const flights = filteredFlights.length;

  const groups = [
    {
      title: t("all_stats.flights"),
      items: [
        [IconPlane, "total_flights", flights],
        [IconWorld, "international", stats.internationalFlights],
        [IconClock, "long_haul", stats.longHaulFlights],
        [IconArrowLeft, "westbound", stats.westBoundFlights],
      ],
    },
    {
      title: t("all_stats.distance_time_co2"),
      items: [
        [IconRoute, "km_flown", stats.totalDistance],
        [
          IconChartLine,
          "km_per_flight",
          flights && stats.totalDistance / flights,
        ],
        [IconHourglass, "days_in_air", stats.totalFlightTime / 24, 1],
        [IconLeaf, "co2_kg", stats.totalCo2, 0, IDS.STATS.TOTAL_CO2],
      ],
    },
    {
      title: t("all_stats.places"),
      items: [
        [IconFlag, "countries", stats.countries],
        [IconMap, "continents", stats.continents],
        [IconBuildingAirport, "airports", stats.airports],
        [IconTicket, "airlines", stats.airlines],
      ],
    },
  ];

  return (
    <Container size="lg" pb={96}>
      <Stack gap={24}>
        <Anchor
          component={Link}
          to={PATHS.STATS}
          c="var(--fl-ink)"
          fw={500}
          underline="never"
          className={classes.back}
        >
          <IconChevronLeft size={22} aria-hidden />
          {t("all_stats.back")}
        </Anchor>

        <Title order={1} fz={26}>
          {t("all_stats.title")}
        </Title>

        {groups.map(({ title, items }) => (
          <Stack component="section" gap={10} key={title}>
            <Title order={2} fz={18}>
              {title}
            </Title>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10}>
              {items.map(([icon, key, value, digits, id], i) => (
                <StatCard
                  key={key}
                  icon={icon}
                  label={t(`all_stats.${key}`)}
                  value={count(value, digits)}
                  main={i === 0}
                  id={id}
                />
              ))}
            </SimpleGrid>
          </Stack>
        ))}

        <Paper component="section" radius={12} p={16} className={classes.card}>
          <Stack gap={14}>
            <Title order={2} fz={18}>
              {t("all_stats.how_far", {
                value: Math.round(stats.totalDistance).toLocaleString(
                  i18n.language,
                ),
              })}
            </Title>
            <JourneyBar
              label={t("all_stats.around_earth")}
              ratio={stats.totalDistance / EARTH_CIRCUMFERENCE}
              aria={(lap) => t("all_stats.earth_aria", { lap })}
              next={(percent, lap) =>
                t("all_stats.earth_next", { percent, lap })
              }
            />
            <JourneyBar
              label={t("all_stats.to_moon")}
              ratio={stats.totalDistance / DISTANCE_TO_MOON}
              aria={(trip) => t("all_stats.moon_aria", { trip })}
              next={(percent, trip) =>
                t("all_stats.moon_next", { percent, trip })
              }
            />
          </Stack>
        </Paper>
      </Stack>

      {/* Same floating filter button as the Stats page, until #119 moves it
          into the header. */}
      <Affix
        position={{
          bottom: "calc(var(--app-shell-footer-offset, 0px) + 16px)",
          left: 16,
        }}
      >
        <Button radius="xl" size="sm" onClick={() => setFiltersOpen(true)}>
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
    </Container>
  );
};

export default AllStats;
