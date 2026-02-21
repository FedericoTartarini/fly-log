import React, { useState } from "react";
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

const FlightsByChart = ({
  filteredFlights,
  data,
  timeGrouping: propTimeGrouping,
  height,
  onTimeGroupingChange,
}) => {
  const [grouping, setGrouping] = useState(CHART_GROUPING.COUNTRY);
  const { t } = useTranslation("flights");

  // If data is provided, it's the old time-based chart
  if (data) {
    const timeChartData = data;
    const timeGrouping = propTimeGrouping || TIME_GROUPING.DAY_OF_WEEK;

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
            onChange={onTimeGroupingChange} // Handled by parent
            data={[
              { label: t("time.day_of_week"), value: TIME_GROUPING.DAY_OF_WEEK },
              { label: t("time.year"), value: TIME_GROUPING.YEAR },
              { label: t("time.month"), value: TIME_GROUPING.MONTH },
            ]}
          />
        </Stack>
        {timeGrouping === TIME_GROUPING.YEAR ? (
          <ScrollArea h={370} scrollbars="y" offsetScrollbars>
            <BarChart
              h={height || (timeChartData.length + 1) * 28}
              data={timeChartData}
              dataKey="period"
              orientation="vertical"
              yAxisProps={{
                width: 60,
              }}
              withXAxis={false}
              gridAxis="none"
              barProps={{ radius: 8 }}
              series={[{ name: "flights", color: "green.6" }]}
              withTooltip={false}
              withBarValueLabel
              valueFormatter={(value) =>
                String(value) === "0" ? "" : String(value)
              }
              valueLabelProps={{ position: "inside", fill: "white" }}
            />
          </ScrollArea>
        ) : (
          <BarChart
            h={height || (timeChartData.length + 1) * 28}
            data={timeChartData}
            dataKey="period"
            orientation="vertical"
            yAxisProps={{
              width: 60,
            }}
            withXAxis={false}
            gridAxis="none"
            barProps={{ radius: 8 }}
            series={[{ name: "flights", color: "green.6" }]}
            withTooltip={false}
            withBarValueLabel
            valueFormatter={(value) =>
              String(value) === "0" ? "" : String(value)
            }
            valueLabelProps={{ position: "inside", fill: "white" }}
          />
        )}
      </Card>
    );
  }

  // New group-based chart
  const getChartData = (flights, groupBy) => {
    if (!flights || !Array.isArray(flights)) return [];
    switch (groupBy) {
      case CHART_GROUPING.COUNTRY:
        return getDeparturesByCountry(flights);
      case CHART_GROUPING.AIRLINE:
        return getFlightsByAirline(flights);
      case CHART_GROUPING.AIRPORT:
        return getFlightsByAirport(flights);
      default:
        return [];
    }
  };

  const chartData = getChartData(filteredFlights, grouping);

  const getDataKey = (groupBy) => {
    switch (groupBy) {
      case CHART_GROUPING.COUNTRY:
        return "country";
      case CHART_GROUPING.AIRLINE:
        return "airline";
      case CHART_GROUPING.AIRPORT:
        return "airport";
      default:
        return "";
    }
  };

  const getSeriesName = (groupBy) => {
    switch (groupBy) {
      case CHART_GROUPING.COUNTRY:
        return "departures";
      case CHART_GROUPING.AIRLINE:
      case CHART_GROUPING.AIRPORT:
        return "flights";

      default:
        return "";
    }
  };

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack mb="md">
        <Title order={3}>
          {t("charts.flights_by", {
            period:
              grouping === CHART_GROUPING.COUNTRY
                ? t("group.country")
                : grouping === CHART_GROUPING.AIRLINE
                  ? t("group.airline")
                  : t("group.airport"),
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
          valueFormatter={(value) =>
            String(value) === "0" ? "" : String(value)
          }
          valueLabelProps={{ position: "inside", fill: "white" }}
          dataKey={getDataKey(grouping)}
          orientation="vertical"
          yAxisProps={{
            width: 110,
          }}
          withXAxis={false}
          gridAxis="none"
          barProps={{ radius: 8 }}
          series={[{ name: getSeriesName(grouping) }]}
          withTooltip={false}
        />
      </ScrollArea>
    </Card>
  );
};

export default FlightsByChart;
