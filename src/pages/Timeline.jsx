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
} from "../utils/chartUtils.js";

const FlightsTopBar = lazy(() => import("../components/FlightsTopBar.jsx"));

// Grid template: a fixed year-label column followed by 12 equal month columns.
const GRID_COLUMNS = `2.5rem repeat(12, 1fr)`;

// Timeline page: a year x month matrix heatmap of flight activity. Each row is a
// year, each column a month, shaded by how many flights departed that month.
function Timeline() {
  const { t } = useTranslation("flights");
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  const isDark = colorScheme === "dark";

  const { filteredFlights, allFlights, isLoading } = useFlightStore(
    useShallow((s) => ({
      filteredFlights: s.filteredFlights,
      allFlights: s.allFlights,
      isLoading: s.isLoading,
    })),
  );

  const matrix = useMemo(
    () => getFlightMonthMatrix(filteredFlights),
    [filteredFlights],
  );
  const stats = useMemo(() => getMonthMatrixStats(matrix), [matrix]);
  const monthLabels = useMemo(() => getLocalizedMonthLabels(), []);

  // Map a flight count to a cell background. Empty months use a neutral,
  // theme-aware fill; busier months step through the brand-red shades.
  // Falls back to Mantine's built-in red palette if the brand color is absent.
  const cellColor = useMemo(() => {
    const reds = theme.colors?.primary ?? theme.colors.red;
    const emptyFill = isDark ? theme.colors.dark[5] : theme.colors.gray[1];
    return (count) => {
      if (!count) return emptyFill;
      if (count === 1) return reds[3];
      if (count === 2) return reds[5];
      if (count === 3) return reds[7];
      return reds[9];
    };
  }, [theme, isDark]);

  const busiestLabel = stats.busiestMonth
    ? `${monthLabels[stats.busiestMonth.month]} ${stats.busiestMonth.year} (${stats.busiestCount})`
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

  const renderCell = (year, count, month) => {
    const label = t("timeline.tooltip", {
      date: `${monthLabels[month]} ${year}`,
      count,
    });
    return (
      <Tooltip key={month} label={label} withinPortal withArrow>
        <Box
          role="img"
          aria-label={label}
          style={{
            height: rem(14),
            borderRadius: rem(3),
            backgroundColor: cellColor(count),
          }}
        />
      </Tooltip>
    );
  };

  return (
    <Container mt="md" size="sm">
      <Stack gap="sm">
        <Title order={3} ta="center">
          {t("timeline.title")}
        </Title>

        {matrix.years.length > 0 ? (
          <>
            <Group justify="space-around" gap="xs">
              <StatDisplay
                id="timeline-total-flights"
                label={t("timeline.stats.total_flights")}
                value={stats.totalFlights}
              />
              <StatDisplay
                id="timeline-active-months"
                label={t("timeline.stats.active_months")}
                value={stats.activeMonths}
              />
              <StatDisplay
                id="timeline-busiest-month"
                label={t("timeline.stats.busiest_month")}
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
                    <Text key={month} size="xs" c="dimmed" ta="center" style={{ fontSize: rem(9) }}>
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
                    <Text size="xs" fw={600} style={{ fontSize: rem(9) }}>
                      {year}
                    </Text>
                    {matrix.counts[year].map((count, month) =>
                      renderCell(year, count, month),
                    )}
                  </Box>
                ))}
              </Box>

              {/* Legend: less -> more */}
              <Group gap={rem(4)} justify="flex-end" mt={rem(6)} align="center">
                <Text size="xs" c="dimmed" style={{ fontSize: rem(9) }}>
                  {t("timeline.legend_less")}
                </Text>
                {[0, 1, 2, 3, 4].map((count) => (
                  <Box
                    key={count}
                    style={{
                      width: rem(10),
                      height: rem(10),
                      borderRadius: rem(2),
                      backgroundColor: cellColor(count),
                    }}
                  />
                ))}
                <Text size="xs" c="dimmed" style={{ fontSize: rem(9) }}>
                  {t("timeline.legend_more")}
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
