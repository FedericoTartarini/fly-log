import React, { useMemo, useState } from "react";
import {
  Title,
  Stack,
  Card,
  SegmentedControl,
  Text,
  Button,
} from "@mantine/core";
import {
  getDeparturesByCountry,
  getFlightsByAirline,
  getAircraftFamily,
  getFlightsByAircraft,
  getFlightsByAirport,
  formatCompactValue,
  formatMetricValue,
} from "../utils/chartUtils.js";
import { useTranslation } from "react-i18next";
import {
  CHART_GROUPING,
  CHART_METRIC,
  TIME_GROUPING,
} from "../constants/filters.ts";
import useFlightStore from "../store.ts";
import { useShallow } from "zustand/react/shallow";
import classes from "./FlightsByChart.module.css";

const CHART_GROUPING_CONFIG = {
  [CHART_GROUPING.COUNTRY]: {
    getData: getDeparturesByCountry,
    dataKey: "country",
    seriesName: "departures",
    tLabel: "group.country",
  },
  [CHART_GROUPING.AIRLINE]: {
    getData: getFlightsByAirline,
    dataKey: "airline",
    seriesName: "flights",
    tLabel: "group.airline",
  },
  [CHART_GROUPING.AIRPORT]: {
    getData: getFlightsByAirport,
    dataKey: "airport",
    seriesName: "flights",
    tLabel: "group.airport",
  },
  [CHART_GROUPING.AIRCRAFT]: {
    getData: getFlightsByAircraft,
    dataKey: "aircraft",
    seriesName: "flights",
    tLabel: "group.aircraft",
  },
};

// Rows shown before "Show more". Enough to cover a week, so the day chart
// never needs the button.
const ROWS_SHOWN = 8;

// Card heading per metric: "Flights by X", "Kilometres flown by X", ...
const TITLE_KEYS = {
  [CHART_METRIC.FLIGHTS]: "charts.flights_by",
  [CHART_METRIC.DISTANCE]: "charts.distance_by",
  [CHART_METRIC.CO2]: "charts.co2_by",
};

// Monday-first, like the day-of-week data.
const longWeekday = (index, locale) =>
  new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(1970, 0, 5 + index)),
  );

/**
 * Horizontal bars as plain HTML: the highest bar is red, the rest ink. Long
 * labels wrap rather than being clipped, and the list grows the card instead
 * of scrolling inside it.
 */
const Bars = ({ rows, labelKey, valueKey }) => {
  const { t, i18n } = useTranslation("flights");
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(0, ...rows.map((r) => r[valueKey]));
  const shown = expanded ? rows : rows.slice(0, ROWS_SHOWN);

  return (
    <Stack gap="xs">
      <div className={classes.bars}>
        {shown.map((row) => (
          <div key={row[labelKey]} className={classes.row}>
            <span className={classes.label}>{row[labelKey]}</span>
            <span className={classes.track}>
              <span
                className={classes.fill}
                data-top={max > 0 && row[valueKey] === max ? "" : undefined}
                style={{
                  width: `${max > 0 ? (row[valueKey] / max) * 100 : 0}%`,
                }}
              />
            </span>
            <span className={classes.value}>
              {formatCompactValue(row[valueKey], i18n.language)}
            </span>
          </div>
        ))}
      </div>
      {rows.length > ROWS_SHOWN && (
        <Button
          variant="default"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? t("charts.show_fewer") : t("charts.show_more")}
        </Button>
      )}
    </Stack>
  );
};

const FlightsByChart = ({ filteredFlights, data }) => {
  const {
    timeGrouping,
    setTimeGrouping,
    grouping,
    setGrouping,
    metric,
    setMetric,
  } = useFlightStore(
    useShallow((s) => ({
      timeGrouping: s.timeGrouping,
      setTimeGrouping: s.setTimeGrouping,
      grouping: s.chartGrouping,
      setGrouping: s.setChartGrouping,
      metric: s.chartMetric,
      setMetric: s.setChartMetric,
    })),
  );
  const { t, i18n } = useTranslation("flights");

  // Both cards share one metric, so the toggle renders identically in each.
  const metricControl = (
    <SegmentedControl
      size="xs"
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
  );

  const currentGroupingConfig =
    CHART_GROUPING_CONFIG[grouping] ||
    CHART_GROUPING_CONFIG[CHART_GROUPING.COUNTRY];
  // Walks every flight, so only redo it when its inputs change.
  const chartData = useMemo(
    () =>
      !filteredFlights || !Array.isArray(filteredFlights)
        ? []
        : currentGroupingConfig.getData(filteredFlights, metric),
    [filteredFlights, currentGroupingConfig, metric],
  );
  const isAircraft = grouping === CHART_GROUPING.AIRCRAFT;
  // Only flights with a known aircraft make it into that chart, so say how many.
  const aircraftKnown = useMemo(
    () =>
      isAircraft && Array.isArray(filteredFlights)
        ? filteredFlights.filter(getAircraftFamily).length
        : 0,
    [isAircraft, filteredFlights],
  );

  // If data is provided, it's the time-based chart
  if (data) {
    const isDays = timeGrouping === TIME_GROUPING.DAY_OF_WEEK;
    const busiest = data.reduce(
      (best, row, i) =>
        row.flights > (best?.row.flights ?? 0) ? { row, i } : best,
      null,
    );

    return (
      <Card shadow="sm" radius="md" withBorder h="100%">
        <Stack gap="sm">
          <Title order={2} fz={17}>
            {t(TITLE_KEYS[metric] ?? TITLE_KEYS[CHART_METRIC.FLIGHTS], {
              period: isDays
                ? t("time.day_of_week")
                : timeGrouping === TIME_GROUPING.YEAR
                  ? t("time.year")
                  : t("time.month"),
            })}
          </Title>
          <SegmentedControl
            size="xs"
            fullWidth
            value={timeGrouping}
            onChange={setTimeGrouping}
            aria-label={t("charts.group_by")}
            data={[
              {
                label: t("time.day_of_week"),
                value: TIME_GROUPING.DAY_OF_WEEK,
              },
              { label: t("time.year"), value: TIME_GROUPING.YEAR },
              { label: t("time.month"), value: TIME_GROUPING.MONTH },
            ]}
          />
          {metricControl}
          <Bars
            key={timeGrouping}
            rows={data}
            labelKey="period"
            valueKey="flights"
          />
          {isDays && busiest && (
            <Text size="sm" c="var(--fl-muted)">
              {t("charts.busiest_day", {
                day: longWeekday(busiest.i, i18n.language),
                value: formatMetricValue(
                  busiest.row.flights,
                  metric,
                  i18n.language,
                ),
                count: busiest.row.flights,
                context:
                  metric === CHART_METRIC.FLIGHTS ? "flights" : undefined,
              })}
            </Text>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" radius="md" withBorder h="100%">
      <Stack gap="sm">
        <Title order={2} fz={17}>
          {t(TITLE_KEYS[metric] ?? TITLE_KEYS[CHART_METRIC.FLIGHTS], {
            period: t(currentGroupingConfig.tLabel),
          })}
        </Title>
        <SegmentedControl
          size="xs"
          fullWidth
          value={grouping}
          onChange={setGrouping}
          aria-label={t("charts.group_by")}
          data={[
            { label: t("group.country"), value: CHART_GROUPING.COUNTRY },
            { label: t("group.airline"), value: CHART_GROUPING.AIRLINE },
            { label: t("group.airport"), value: CHART_GROUPING.AIRPORT },
            { label: t("group.aircraft"), value: CHART_GROUPING.AIRCRAFT },
          ]}
        />
        {metricControl}
        {isAircraft && chartData.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("charts.no_aircraft_data")}
          </Text>
        ) : (
          <Bars
            key={grouping}
            rows={chartData}
            labelKey={currentGroupingConfig.dataKey}
            valueKey={currentGroupingConfig.seriesName}
          />
        )}
        {isAircraft &&
          aircraftKnown > 0 &&
          aircraftKnown < filteredFlights.length && (
            <Text size="xs" c="dimmed">
              {t("charts.aircraft_subset", {
                known: aircraftKnown,
                total: filteredFlights.length,
              })}
            </Text>
          )}
      </Stack>
    </Card>
  );
};

export default FlightsByChart;
