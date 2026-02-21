import React from "react";
import { NativeSelect } from "@mantine/core";
import useFlightStore from "../store.ts";
import { parseToDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";
import { YEAR_FILTER } from "../constants/filters.ts";

const FlightYearFilter = () => {
  const selectedYear = useFlightStore((s) => s.selectedYear);
  const setSelectedYear = useFlightStore((s) => s.setSelectedYear);
  const allFlights = useFlightStore((s) => s.allFlights);
  const { t } = useTranslation("flights");

  // Extract unique years from all flights
  const yearsSet = new Set();
  allFlights.forEach((flight) => {
    const dt = parseToDate(flight.departure_date);
    if (!dt) return;
    yearsSet.add(dt.getFullYear());
  });

  const years = Array.from(yearsSet).sort((a, b) => b - a);

  return (
    <NativeSelect
      value={selectedYear}
      onChange={(e) => setSelectedYear(e.target.value)}
      mt="md"
      mb="xs"
      id="flight-year-filter"
      label={t("filter.label")}
      data={[
        { value: YEAR_FILTER.ALL, label: t("filter.all") },
        { value: YEAR_FILTER.UPCOMING, label: t("filter.upcoming") },
        { value: YEAR_FILTER.PAST, label: t("filter.past") },
        ...years.map((year) => ({
          value: String(year),
          label: String(year),
        })),
      ]}
    />
  );
};

export default FlightYearFilter;
