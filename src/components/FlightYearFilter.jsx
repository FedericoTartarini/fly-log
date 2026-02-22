import React from "react";
import { NativeSelect } from "@mantine/core";
import useFlightStore from "../store.ts";
import { useTranslation } from "react-i18next";
import { buildYearFilterSelectData } from "../utils/yearFilterOptions.ts";
import { useShallow } from "zustand/react/shallow";

const FlightYearFilter = () => {
  const { selectedYear, setSelectedYear, allFlights } = useFlightStore(
    useShallow((s) => ({
      selectedYear: s.selectedYear,
      setSelectedYear: s.setSelectedYear,
      allFlights: s.allFlights,
    })),
  );
  const { t } = useTranslation("flights");
  const yearFilterOptions = buildYearFilterSelectData(allFlights, t);

  return (
    <NativeSelect
      value={selectedYear}
      onChange={(e) => setSelectedYear(e.target.value)}
      mt="md"
      mb="xs"
      id="flight-year-filter"
      label={t("filter.label")}
      data={yearFilterOptions}
    />
  );
};

export default FlightYearFilter;
