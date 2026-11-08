import React, { lazy, Suspense, useMemo, useState } from "react";
import {
  Container,
  Title,
  Stack,
  Center,
  Loader,
  Text,
  SegmentedControl,
  SimpleGrid,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store.ts";
import TimelineSkeleton from "../components/TimelineSkeleton.jsx";
import {
  getFlightMonthMatrix,
  getMonthMatrixStats,
  getLocalizedMonthLabels,
  formatMetricValue,
  formatCompactValue,
  heatStep,
} from "../utils/chartUtils.js";
import { CHART_METRIC } from "../constants/filters.ts";
import classes from "./Timeline.module.css";

const NoFlightsCard = lazy(() => import("../components/NoFlightsCard.jsx"));

const TOTAL_KEYS = {
  [CHART_METRIC.FLIGHTS]: "timeline.stats.total_flights",
  [CHART_METRIC.DISTANCE]: "timeline.stats.total_distance",
  [CHART_METRIC.CO2]: "timeline.stats.total_co2",
};

// Timeline page: a year x month heatmap of flight activity, newest year on
// top, shaded by flights, kilometres or CO₂e. Tapping a month reads its value
// out above the grid, because hover tooltips do not work on phones.
function Timeline() {
  const { t, i18n } = useTranslation("flights");
  const [picked, setPicked] = useState(null);

  // The grid's vertical axis is the year, so it always plots the complete
  // history: applying the shared year filter would collapse it to one row.
  const { allFlights, isLoading, error, metric, setMetric } = useFlightStore(
    useShallow((s) => ({
      allFlights: s.allFlights,
      isLoading: s.isLoading,
      error: s.error,
      metric: s.chartMetric,
      setMetric: s.setChartMetric,
    })),
  );
  const isCount =
    metric !== CHART_METRIC.DISTANCE && metric !== CHART_METRIC.CO2;
  const metricKey = isCount ? CHART_METRIC.FLIGHTS : metric;

  const matrix = useMemo(
    () => getFlightMonthMatrix(allFlights, metric),
    [allFlights, metric],
  );
  const stats = useMemo(() => getMonthMatrixStats(matrix), [matrix]);
  const months = useMemo(
    () => ({
      narrow: getLocalizedMonthLabels(i18n.language, "narrow"),
      short: getLocalizedMonthLabels(i18n.language),
      long: getLocalizedMonthLabels(i18n.language, "long"),
    }),
    [i18n.language],
  );

  if (isLoading) return <TimelineSkeleton />;

  if (error) {
    return (
      <Container mt="md">
        <Text c="red" size="lg" ta="center" role="alert">
          {t("timeline.error", { error })}
        </Text>
      </Container>
    );
  }

  // No flights at all: show the shared add-flight call to action.
  if (!allFlights || allFlights.length === 0) {
    return (
      <Container size="sm" mt="md" pb={96}>
        <Stack gap="md">
          <Title order={1} fz={28}>
            {t("timeline.title")}
          </Title>
          <Suspense
            fallback={
              <Center>
                <Loader aria-label={t("loading")} />
              </Center>
            }
          >
            <NoFlightsCard
              title={t("no_flights_card.timeline_title")}
              text={t("no_flights_card.timeline_text")}
            />
          </Suspense>
        </Stack>
      </Container>
    );
  }

  // Every year from the newest down to the oldest, including years with no
  // flights, so the rows read as an unbroken calendar.
  const newest = matrix.years.at(-1);
  const oldest = matrix.years[0];
  const years = matrix.years.length
    ? Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i)
    : [];
  const valueAt = (year, month) => matrix.counts[year]?.[month] ?? 0;

  // Months flown out of the months from the first flown month to the last.
  const flown = [...years]
    .reverse()
    .flatMap((year) => Array.from({ length: 12 }, (_, m) => valueAt(year, m)))
    .map((value) => value > 0);
  // No month has a value when, say, no flight has a distance yet.
  const spanMonths = flown.includes(true)
    ? flown.lastIndexOf(true) - flown.indexOf(true) + 1
    : 0;

  const describe = (value) => {
    if (!value) return t("timeline.value_none");
    return isCount
      ? t("timeline.value", { count: value })
      : formatMetricValue(value, metric, i18n.language);
  };
  const compact = (value) => formatCompactValue(value, i18n.language);

  // The busiest month is selected until the visitor taps another.
  const selected = picked ?? stats.busiestMonth;
  const busiest = stats.busiestMonth;
  // Built by hand rather than with Intl's 2-digit year, which writes "Mar ’25"
  // on some systems and "Mar 25" on others.
  const busiestLabel = busiest
    ? `${months.short[busiest.month]} ${String(busiest.year).slice(2)}`
    : "—";

  const gridTitle = t(`timeline.grid_title.${metricKey}`);
  const tiles = [
    {
      id: "timeline-total-flights",
      label: t(TOTAL_KEYS[metricKey]),
      value: compact(stats.total),
      note: t("timeline.stats.since", { year: oldest }),
    },
    {
      id: "timeline-active-months",
      label: t("timeline.stats.active_months"),
      value: stats.activeMonths,
      note: t("timeline.stats.of_months", { count: spanMonths }),
    },
    {
      id: "timeline-busiest-month",
      label: t("timeline.stats.busiest_month"),
      value: busiestLabel,
      note: compact(stats.busiestValue),
    },
  ];

  return (
    <Container mt="md" size="sm" pb={96}>
      <Stack gap="md">
        <div>
          <Title order={1} fz={28}>
            {t("timeline.title")}
          </Title>
          <Text c="var(--fl-muted)" mt={2}>
            {t("timeline.subtitle")}
          </Text>
        </div>

        <SegmentedControl
          fullWidth
          value={metric}
          onChange={setMetric}
          aria-label={t("charts.measure")}
          data={[
            { label: t("metric.flights"), value: CHART_METRIC.FLIGHTS },
            { label: t("metric.distance"), value: CHART_METRIC.DISTANCE },
            { label: t("metric.co2"), value: CHART_METRIC.CO2 },
          ]}
        />

        {years.length > 0 ? (
          <>
            <SimpleGrid cols={3} spacing={8}>
              {tiles.map((tile) => (
                <div key={tile.id} className={classes.tile}>
                  <span
                    className={classes.tileLabel}
                    data-cy={`${tile.id}-label`}
                  >
                    {tile.label}
                  </span>
                  <span
                    className={classes.tileValue}
                    data-cy={`${tile.id}-value`}
                  >
                    {tile.value}
                  </span>
                  <span className={classes.tileNote}>{tile.note}</span>
                </div>
              ))}
            </SimpleGrid>

            <section
              className={classes.grid}
              aria-labelledby="timeline-grid-title"
            >
              <div className={classes.gridHead}>
                <Title order={2} fz={17} id="timeline-grid-title">
                  {gridTitle}
                </Title>
                {/* Read out whenever the visitor picks another month. */}
                <p className={classes.pick} aria-live="polite">
                  {selected && (
                    <>
                      <strong>
                        {months.long[selected.month]} {selected.year}
                      </strong>{" "}
                      <Text span inherit c="var(--fl-muted)">
                        · {describe(valueAt(selected.year, selected.month))}
                      </Text>
                    </>
                  )}
                </p>
              </div>

              <div className={classes.row} aria-hidden="true">
                <span />
                {months.narrow.map((letter, month) => (
                  <abbr
                    key={month}
                    title={months.long[month]}
                    className={classes.month}
                  >
                    {letter}
                  </abbr>
                ))}
              </div>

              <div
                className={classes.rows}
                role="group"
                aria-label={t("timeline.grid_label", { title: gridTitle })}
              >
                {years.map((year) => (
                  <div key={year} className={classes.row}>
                    <span
                      className={classes.year}
                      data-active={matrix.counts[year] ? true : undefined}
                    >
                      {year}
                    </span>
                    {Array.from({ length: 12 }, (_, month) => {
                      const value = valueAt(year, month);
                      const isSelected =
                        selected?.year === year && selected?.month === month;
                      return (
                        <button
                          key={month}
                          type="button"
                          className={classes.cell}
                          aria-pressed={isSelected}
                          aria-label={t("timeline.cell", {
                            date: `${months.short[month]} ${year}`,
                            value: describe(value),
                          })}
                          onClick={() => setPicked({ year, month })}
                          style={{
                            background: `var(--fl-heat-${heatStep(value, isCount, stats.busiestValue)})`,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className={classes.legend}>
                <span style={{ marginRight: 4 }}>
                  {isCount ? t("timeline.legend_none") : compact(0)}
                </span>
                {[0, 1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    aria-hidden="true"
                    className={classes.swatch}
                    style={{ background: `var(--fl-heat-${step})` }}
                  />
                ))}
                <span style={{ marginLeft: 4 }}>
                  {isCount ? "4+" : compact(stats.busiestValue)}
                </span>
              </div>
            </section>
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
