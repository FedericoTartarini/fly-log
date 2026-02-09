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

const FlightsByChart = ({
  filteredFlights,
  data,
  timeGrouping: propTimeGrouping,
  height,
  onTimeGroupingChange,
}) => {
  const [grouping, setGrouping] = useState("country");
  const { t } = useTranslation("flights");

  // If data is provided, it's the old time-based chart
  if (data) {
    const timeChartData = data;
    const timeGrouping = propTimeGrouping || "dayOfWeek";

    return (
      <Card shadow="sm" radius="md" withBorder>
        <Stack mb="md">
          <Title order={3}>
            {t("charts.flights_by", {
              period:
                timeGrouping === "dayOfWeek"
                  ? t("time.day_of_week")
                  : timeGrouping === "year"
                    ? t("time.year")
                    : t("time.month"),
            })}
          </Title>
          <SegmentedControl
            value={timeGrouping}
            onChange={onTimeGroupingChange} // Handled by parent
            data={[
              { label: t("time.day_of_week"), value: "dayOfWeek" },
              { label: t("time.year"), value: "year" },
              { label: t("time.month"), value: "month" },
            ]}
          />
        </Stack>
        {timeGrouping === "year" ? (
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
              series={[{ name: "flights", color: "blue.6" }]}
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
            series={[{ name: "flights", color: "blue.6" }]}
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
      case "country":
        return getDeparturesByCountry(flights);
      case "airline":
        return getFlightsByAirline(flights);
      case "airport":
        return getFlightsByAirport(flights);
      default:
        return [];
    }
  };

  const chartData = getChartData(filteredFlights, grouping);

  const getDataKey = (groupBy) => {
    switch (groupBy) {
      case "country":
        return "country";
      case "airline":
        return "airline";
      case "airport":
        return "airport";
      default:
        return "";
    }
  };

  const getSeriesName = (groupBy) => {
    switch (groupBy) {
      case "country":
        return "departures";
      case "airline":
      case "airport":
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
              grouping === "country"
                ? t("group.country")
                : grouping === "airline"
                  ? t("group.airline")
                  : t("group.airport"),
          })}
        </Title>
        <SegmentedControl
          value={grouping}
          onChange={setGrouping}
          data={[
            { label: t("group.country"), value: "country" },
            { label: t("group.airline"), value: "airline" },
            { label: t("group.airport"), value: "airport" },
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
          series={[{ name: getSeriesName(grouping), color: "blue.6" }]}
          withTooltip={false}
        />
      </ScrollArea>
    </Card>
  );
};

export default FlightsByChart;
