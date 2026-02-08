import React from "react";
import { NativeSelect } from "@mantine/core";
import useFlightStore from "../store.ts";
import { parseToDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";

const FlightYearFilter = () => {
  const { selectedYear, setSelectedYear, allFlights } = useFlightStore();
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
        { value: "all", label: t("filter.all") },
        { value: "upcoming", label: t("filter.upcoming") },
        { value: "past", label: t("filter.past") },
        ...years.map((year) => ({
          value: String(year),
          label: String(year),
        })),
      ]}
    />
  );
};

export default FlightYearFilter;
