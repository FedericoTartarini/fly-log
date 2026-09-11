import React, { lazy, Suspense, useMemo } from "react";
import {
  Container,
  Title,
  Stack,
  Card,
  Group,
  Center,
  Loader,
  Text,
  Box,
  Tooltip,
  SegmentedControl,
  rem,
  useMantineTheme,
  useComputedColorScheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store.ts";
import StatDisplay from "../components/StatDisplay.jsx";
import {
  getFlightMonthMatrix,
  getMonthMatrixStats,
  getLocalizedMonthLabels,
  formatMetricValue,
} from "../utils/chartUtils.js";
import { CHART_METRIC } from "../constants/filters.ts";

const FlightsTopBar = lazy(() => import("../components/FlightsTopBar.jsx"));

// Grid template: a fixed year-label column followed by 12 equal month columns.
const GRID_COLUMNS = `2.5rem repeat(12, 1fr)`;

// Timeline page: a year x month matrix heatmap of flight activity. Each row is
// a year, each column a month, shaded by either the number of flights that
// month or the distance flown, depending on the shared chart metric.
function Timeline() {
  const { t, i18n } = useTranslation("flights");
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  const isDark = colorScheme === "dark";

  // The grid's vertical axis is the year, so it always plots the complete
  // history: applying the shared year filter would collapse it to one row.
  const { allFlights, isLoading, metric, setMetric } = useFlightStore(
    useShallow((s) => ({
      allFlights: s.allFlights,
      isLoading: s.isLoading,
      metric: s.chartMetric,
      setMetric: s.setChartMetric,
    })),
  );
  const isDistance = metric === CHART_METRIC.DISTANCE;

  const matrix = useMemo(
    () => getFlightMonthMatrix(allFlights, metric),
    [allFlights, metric],
  );
  const stats = useMemo(() => getMonthMatrixStats(matrix), [matrix]);
  const monthLabels = useMemo(
    () => getLocalizedMonthLabels(i18n.language),
    [i18n.language],
  );

  // Five shades, from an empty month to the darkest. Falls back to Mantine's
  // built-in red palette if the brand color is absent.
  const shades = useMemo(() => {
    const reds = theme.colors?.primary ?? theme.colors.red;
    const emptyFill = isDark ? theme.colors.dark[5] : theme.colors.gray[1];
    return [emptyFill, reds[3], reds[5], reds[7], reds[9]];
  }, [theme, isDark]);

  // Flight counts use fixed buckets, so one shade always means one number.
  // Kilometres have no natural step size, so they scale against the busiest
  // month instead.
  const bucketOf = useMemo(() => {
    if (!isDistance) return (value) => Math.min(value, 4);
    const max = stats.busiestValue || 1;
    return (value) => (value ? Math.ceil((value / max) * 4) : 0);
  }, [isDistance, stats.busiestValue]);

  const formatValue = (value) =>
    formatMetricValue(value, metric, i18n.language);

  const busiestLabel = stats.busiestMonth
    ? `${monthLabels[stats.busiestMonth.month]} ${stats.busiestMonth.year} (${formatValue(stats.busiestValue)})`
    : "—";

  if (isLoading) {
    return (
      <Container mt="md">
        <Stack gap="xl">
          <Title order={2} ta="center">
            {t("timeline.title")}
          </Title>
          <Center>
            <Loader aria-label={t("loading")} />
          </Center>
        </Stack>
      </Container>
    );
  }

  // No flights at all: show the shared add-flight call to action.
  if (!allFlights || allFlights.length === 0) {
    return (
      <Container mt="md">
        <Stack gap="xl">
          <Title order={2} ta="center">
            {t("timeline.title")}
          </Title>
          <Suspense
            fallback={
              <Center>
                <Loader aria-label={t("loading")} />
              </Center>
            }
          >
            <FlightsTopBar fullWidth={true} />
          </Suspense>
        </Stack>
      </Container>
    );
  }

  const renderCell = (year, value, month) => {
    const label = isDistance
      ? t("timeline.tooltip_distance", {
          date: `${monthLabels[month]} ${year}`,
          value: formatValue(value),
        })
      : t("timeline.tooltip", {
          date: `${monthLabels[month]} ${year}`,
          count: value,
        });
    return (
      <Tooltip key={month} label={label} withinPortal withArrow>
        <Box
          role={value ? "img" : undefined}
          aria-label={value ? label : undefined}
          style={{
            height: rem(14),
            borderRadius: rem(3),
            backgroundColor: shades[bucketOf(value)],
          }}
        />
      </Tooltip>
    );
  };

  return (
    <Container mt="md" size="sm">
      <Stack gap="sm">
        <Title order={2} ta="center">
          {t("timeline.title")}
        </Title>
        <Text size="sm" c="dimmed" ta="center">
          {t(isDistance ? "timeline.subtitle_distance" : "timeline.subtitle")}
        </Text>
        <Group justify="center">
          <SegmentedControl
            value={metric}
            onChange={setMetric}
            data={[
              { label: t("metric.flights"), value: CHART_METRIC.FLIGHTS },
              { label: t("metric.distance"), value: CHART_METRIC.DISTANCE },
            ]}
          />
        </Group>

        {matrix.years.length > 0 ? (
          <>
            <Group justify="space-around" gap="xs">
              <StatDisplay
                id="timeline-total-flights"
                label={t(
                  isDistance
                    ? "timeline.stats.total_distance"
                    : "timeline.stats.total_flights",
                )}
                value={formatValue(stats.total)}
              />
              <StatDisplay
                id="timeline-active-months"
                label={t("timeline.stats.active_months")}
                value={stats.activeMonths}
              />
              <StatDisplay
                id="timeline-busiest-month"
                label={t(
                  isDistance
                    ? "timeline.stats.busiest_month_distance"
                    : "timeline.stats.busiest_month",
                )}
                value={busiestLabel}
              />
            </Group>

            <Card shadow="sm" radius="md" withBorder p="xs">
              <Box>
                {/* Month label header row */}
                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns: GRID_COLUMNS,
                    gap: rem(3),
                    alignItems: "center",
                  }}
                >
                  <div />
                  {monthLabels.map((month) => (
                    <Text key={month} size="xs" c="dimmed" ta="center">
                      {month}
                    </Text>
                  ))}
                </Box>

                {/* One row per year */}
                {matrix.years.map((year) => (
                  <Box
                    key={year}
                    mt={rem(2)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID_COLUMNS,
                      gap: rem(3),
                      alignItems: "center",
                    }}
                  >
                    <Text size="xs" fw={600}>
                      {year}
                    </Text>
                    {matrix.counts[year].map((count, month) =>
                      renderCell(year, count, month),
                    )}
                  </Box>
                ))}
              </Box>

              {/* Legend: an empty month -> the busiest month in the data */}
              <Group gap={rem(4)} justify="flex-end" mt={rem(6)} align="center">
                <Text size="xs" c="dimmed">
                  {isDistance ? formatValue(0) : t("timeline.legend_none")}
                </Text>
                {/* In flights mode the shades are fixed buckets, so hide any
                    the data never reaches: the right-hand label must describe
                    the darkest square shown. Distances scale to the busiest
                    month, so every shade is always in play. */}
                {[0, 1, 2, 3, 4]
                  .filter(
                    (bucket) => isDistance || bucket <= stats.busiestValue,
                  )
                  .map((bucket) => (
                    <Box
                      key={bucket}
                      style={{
                        width: rem(10),
                        height: rem(10),
                        borderRadius: rem(2),
                        backgroundColor: shades[bucket],
                      }}
                    />
                  ))}
                <Text size="xs" c="dimmed">
                  {isDistance
                    ? formatValue(stats.busiestValue)
                    : t("timeline.legend_max", { count: stats.busiestValue })}
                </Text>
              </Group>
            </Card>
          </>
        ) : (
          <Text c="dimmed" ta="center">
            {t("no_flights")}
          </Text>
        )}
      </Stack>
    </Container>
  );
}

export default Timeline;
