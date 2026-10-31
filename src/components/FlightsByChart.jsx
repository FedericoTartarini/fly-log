import React, { useMemo } from "react";
import {
  Title,
  Stack,
  Card,
  SegmentedControl,
  ScrollArea,
  Text,
} from "@mantine/core";
import { BarChart } from "@mantine/charts";
import {
  getDeparturesByCountry,
  getFlightsByAirline,
  getAircraftFamily,
  getFlightsByAircraft,
  getFlightsByAirport,
  formatCompactValue,
  labelFitsInsideBar,
} from "../utils/chartUtils.js";
import { useTranslation } from "react-i18next";
import {
  CHART_GROUPING,
  CHART_METRIC,
  TIME_GROUPING,
} from "../constants/filters.ts";
import useFlightStore from "../store.ts";
import { useShallow } from "zustand/react/shallow";

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

// Recharts passes each label its bar's geometry, which lets a value that would
// not fit inside a short bar sit just outside its right-hand end instead.
const makeBarValueLabel = (locale) =>
  function BarValueLabel({ x, y, width, height, value }) {
    if (!value) return null;
    const text = formatCompactValue(value, locale);
    const fitsInside = labelFitsInsideBar(width, text);
    return (
      <text
        x={fitsInside ? x + width - 8 : x + width + 6}
        y={y + height / 2}
        textAnchor={fitsInside ? "end" : "start"}
        dominantBaseline="central"
        fontSize={12}
        fill={fitsInside ? "white" : "var(--mantine-color-dimmed)"}
      >
        {text}
      </text>
    );
  };

// Aircraft names are long ("Airbus A320 NEO"), so the maker goes on its own
// line above the model rather than widening the axis, which phones can't spare.
const AircraftTick = ({ x, y, payload }) => {
  const [maker, ...model] = String(payload.value).split(" ");
  const lines = model.length ? [maker, model.join(" ")] : [maker];
  return (
    // Same offset and colour as Mantine's own ticks.
    <text
      x={x}
      y={y}
      transform="translate(-10, 0)"
      textAnchor="end"
      dominantBaseline="central"
      fontSize={12}
      fill="currentColor"
    >
      {lines.map((line, i) => (
        <tspan
          key={line}
          x={x}
          dy={i === 0 ? `${(1 - lines.length) * 0.6}em` : "1.2em"}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
};

// Card heading per metric: "Flights by X", "Kilometres flown by X", ...
const TITLE_KEYS = {
  [CHART_METRIC.FLIGHTS]: "charts.flights_by",
  [CHART_METRIC.DISTANCE]: "charts.distance_by",
  [CHART_METRIC.CO2]: "charts.co2_by",
};

const FlightsByChart = ({ filteredFlights, data, height }) => {
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
      value={metric}
      onChange={setMetric}
      data={[
        { label: t("metric.flights"), value: CHART_METRIC.FLIGHTS },
        { label: t("metric.distance"), value: CHART_METRIC.DISTANCE },
        { label: t("metric.co2"), value: CHART_METRIC.CO2 },
      ]}
    />
  );
  const valueLabelProps = { content: makeBarValueLabel(i18n.language) };

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

  // If data is provided, it's the old time-based chart
  if (data) {
    const timeChartData = data;
    const commonTimeBarProps = {
      h: height || (timeChartData.length + 1) * 28,
      data: timeChartData,
      dataKey: "period",
      orientation: "vertical",
      yAxisProps: {
        width: 60,
      },
      withXAxis: false,
      gridAxis: "none",
      barProps: { radius: 8, barSize: 23 },
      series: [{ name: "flights", color: "primary.4" }],
      withTooltip: false,
      withBarValueLabel: true,
      valueLabelProps,
    };

    return (
      <Card shadow="sm" radius="md" withBorder>
        <Stack mb="md">
          <Title order={3}>
            {t(TITLE_KEYS[metric] ?? TITLE_KEYS[CHART_METRIC.FLIGHTS], {
              period:
                timeGrouping === TIME_GROUPING.DAY_OF_WEEK
                  ? t("time.day_of_week")
                  : timeGrouping === TIME_GROUPING.YEAR
                    ? t("time.year")
                    : t("time.month"),
            })}
          </Title>
          <SegmentedControl
            value={timeGrouping}
            onChange={setTimeGrouping}
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
        </Stack>
        {timeGrouping === TIME_GROUPING.YEAR && (
          <ScrollArea h={370} scrollbars="y" offsetScrollbars>
            <BarChart {...commonTimeBarProps} />
          </ScrollArea>
        )}
        {timeGrouping !== TIME_GROUPING.YEAR && (
          <BarChart {...commonTimeBarProps} />
        )}
      </Card>
    );
  }

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack mb="md">
        <Title order={3}>
          {t(TITLE_KEYS[metric] ?? TITLE_KEYS[CHART_METRIC.FLIGHTS], {
            period: t(currentGroupingConfig.tLabel),
          })}
        </Title>
        <SegmentedControl
          value={grouping}
          onChange={setGrouping}
          data={[
            { label: t("group.country"), value: CHART_GROUPING.COUNTRY },
            { label: t("group.airline"), value: CHART_GROUPING.AIRLINE },
            { label: t("group.airport"), value: CHART_GROUPING.AIRPORT },
            { label: t("group.aircraft"), value: CHART_GROUPING.AIRCRAFT },
          ]}
        />
        {metricControl}
      </Stack>
      <ScrollArea h={370} scrollbars="y" type="always" offsetScrollbars>
        {isAircraft && chartData.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("charts.no_aircraft_data")}
          </Text>
        ) : (
          <BarChart
            h={(chartData.length + 1) * 28}
            data={chartData}
            withBarValueLabel
            valueLabelProps={valueLabelProps}
            dataKey={currentGroupingConfig.dataKey}
            orientation="vertical"
            yAxisProps={{
              width: 100,
              ...(isAircraft && { tick: AircraftTick }),
            }}
            withXAxis={false}
            gridAxis="none"
            barProps={{ radius: 8, barSize: 23 }}
            series={[
              {
                name: currentGroupingConfig.seriesName,
                color: "primary.4",
              },
            ]}
            withTooltip={false}
          />
        )}
      </ScrollArea>
      {isAircraft &&
        aircraftKnown > 0 &&
        aircraftKnown < filteredFlights.length && (
          <Text size="xs" c="dimmed" mt="xs">
            {t("charts.aircraft_subset", {
              known: aircraftKnown,
              total: filteredFlights.length,
            })}
          </Text>
        )}
    </Card>
  );
};

export default FlightsByChart;
