import React from "react";
import {
  Title,
  Stack,
  Card,
  SegmentedControl,
  ScrollArea,
} from "@mantine/core";
import { BarChart } from "@mantine/charts";
import {
  getDeparturesByCountry,
  getFlightsByAirline,
  getFlightsByAirport,
} from "../utils/chartUtils.js";
import { useTranslation } from "react-i18next";
import { CHART_GROUPING, TIME_GROUPING } from "../constants/filters.ts";
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
};

const VALUE_FORMATTER = (value) => (String(value) === "0" ? "" : String(value));

const FlightsByChart = ({
  filteredFlights,
  data,
  height,
}) => {
  const { timeGrouping, setTimeGrouping, grouping, setGrouping } = useFlightStore(
    useShallow((s) => ({
      timeGrouping: s.timeGrouping,
      setTimeGrouping: s.setTimeGrouping,
      grouping: s.chartGrouping,
      setGrouping: s.setChartGrouping,
    })),
  );
  const { t } = useTranslation("flights");

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
      barProps: { radius: 8 },
      series: [{ name: "flights", color: "green.6" }],
      withTooltip: false,
      withBarValueLabel: true,
      valueFormatter: VALUE_FORMATTER,
      valueLabelProps: { position: "inside", fill: "white" },
    };

    return (
      <Card shadow="sm" radius="md" withBorder>
        <Stack mb="md">
          <Title order={3}>
            {t("charts.flights_by", {
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
              { label: t("time.day_of_week"), value: TIME_GROUPING.DAY_OF_WEEK },
              { label: t("time.year"), value: TIME_GROUPING.YEAR },
              { label: t("time.month"), value: TIME_GROUPING.MONTH },
            ]}
          />
        </Stack>
        {timeGrouping === TIME_GROUPING.YEAR && (
          <ScrollArea h={370} scrollbars="y" offsetScrollbars>
            <BarChart {...commonTimeBarProps} />
          </ScrollArea>
        )}
        {timeGrouping !== TIME_GROUPING.YEAR && <BarChart {...commonTimeBarProps} />}
      </Card>
    );
  }

  const currentGroupingConfig =
    CHART_GROUPING_CONFIG[grouping] || CHART_GROUPING_CONFIG[CHART_GROUPING.COUNTRY];
  const chartData =
    !filteredFlights || !Array.isArray(filteredFlights)
      ? []
      : currentGroupingConfig.getData(filteredFlights);

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack mb="md">
        <Title order={3}>
          {t("charts.flights_by", {
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
          ]}
        />
      </Stack>
      <ScrollArea h={370} scrollbars="y" type="always" offsetScrollbars>
        <BarChart
          h={(chartData.length + 1) * 28}
          data={chartData}
          withBarValueLabel
          valueFormatter={VALUE_FORMATTER}
          valueLabelProps={{ position: "inside", fill: "white" }}
          dataKey={currentGroupingConfig.dataKey}
          orientation="vertical"
          yAxisProps={{
            width: 110,
          }}
          withXAxis={false}
          gridAxis="none"
          barProps={{ radius: 8 }}
          series={[{ name: currentGroupingConfig.seriesName }]}
          withTooltip={false}
        />
      </ScrollArea>
    </Card>
  );
};

export default FlightsByChart;
