import React from "react";
import {
  Button,
  Group,
  Select,
  Stack,
  RangeSlider,
  NativeSelect,
  Text,
} from "@mantine/core";
import useFlightStore from "../store";
import { useTranslation } from "react-i18next";
import type { enhancedFlight } from "../types/enhancedFlight";
import { useShallow } from "zustand/react/shallow";
import { loadAirportsInfo, type AirportInfo } from "../utils/referenceData";
import { YEAR_FILTER } from "../constants/filters";
import { buildYearFilterSelectData } from "../utils/yearFilterOptions";
import {
  buildAirlineOptions,
  buildAirportOptions,
} from "../utils/flightFilterOptions";
import { filterFlightsForFacetOptions } from "../utils/flightFilterFacets";
import type { FlightStoreState, StoreFlightFilters } from "../store";

const FlightFilters: React.FC = () => {
  const { t } = useTranslation("flights");
  const { allFlights, filters, setFilters, clearFilters, selectedYear, setSelectedYear } =
    useFlightStore(
      useShallow((s: FlightStoreState) => ({
        allFlights: s.allFlights as enhancedFlight[],
        filters: s.filters as StoreFlightFilters,
        setFilters: s.setFilters,
        clearFilters: s.clearFilters,
        selectedYear: s.selectedYear,
        setSelectedYear: s.setSelectedYear,
      })),
    );
  const [airportsData, setAirportsData] = React.useState<AirportInfo[]>([]);

  React.useEffect(() => {
    let mounted = true;
    loadAirportsInfo().then((data) => {
      if (mounted) setAirportsData(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const yearFilterOptions = React.useMemo(
    () => buildYearFilterSelectData(allFlights, t),
    [allFlights, t],
  );

  const flightsForAirlineOptions = React.useMemo(
    () => filterFlightsForFacetOptions(allFlights, selectedYear, filters, "airline"),
    [allFlights, selectedYear, filters],
  );

  const flightsForDepartureOptions = React.useMemo(
    () =>
      filterFlightsForFacetOptions(
        allFlights,
        selectedYear,
        filters,
        "departureAirport",
      ),
    [allFlights, selectedYear, filters],
  );

  const flightsForArrivalOptions = React.useMemo(
    () =>
      filterFlightsForFacetOptions(
        allFlights,
        selectedYear,
        filters,
        "arrivalAirport",
      ),
    [allFlights, selectedYear, filters],
  );

  const airlineOptions = React.useMemo(
    () => buildAirlineOptions(flightsForAirlineOptions),
    [flightsForAirlineOptions],
  );

  const departureOptions = React.useMemo(
    () =>
      buildAirportOptions(
        flightsForDepartureOptions,
        airportsData,
        "departure_airport_iata",
      ),
    [flightsForDepartureOptions, airportsData],
  );

  const arrivalOptions = React.useMemo(
    () =>
      buildAirportOptions(
        flightsForArrivalOptions,
        airportsData,
        "arrival_airport_iata",
      ),
    [flightsForArrivalOptions, airportsData],
  );

  const hasFilters =
    Boolean(filters.airline) ||
    Boolean(filters.departureAirport) ||
    Boolean(filters.arrivalAirport) ||
    filters.minDuration !== null ||
    filters.maxDuration !== null ||
    (selectedYear && selectedYear !== YEAR_FILTER.ALL);

  // RangeSlider state (hours) - default range 0..24
  const DEFAULT_MIN = 0;
  const DEFAULT_MAX = 24;
  const [rangeValue, setRangeValue] = React.useState<[number, number]>([
    filters.minDuration ?? DEFAULT_MIN,
    filters.maxDuration ?? DEFAULT_MAX,
  ]);

  // Sync range when filters update externally
  React.useEffect(() => {
    setRangeValue([
      filters.minDuration ?? DEFAULT_MIN,
      filters.maxDuration ?? DEFAULT_MAX,
    ]);
  }, [filters.minDuration, filters.maxDuration]);

  const toNumber = (value: string | number): number | null => {
    if (typeof value !== "number" || Number.isNaN(value)) return null;
    return value;
  };

  return (
    <Stack gap="xs">
      <Group grow>
        <NativeSelect
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          id="flight-year-filter"
          label={t("filter.label")}
          data={yearFilterOptions}
        />
        <Select
          label={t("filters.departure_airport")}
          placeholder={t("filters.departure_airport_placeholder")}
          data={departureOptions}
          clearable
          searchable
          value={filters.departureAirport}
          onChange={(value) => setFilters({ departureAirport: value })}
          nothingFoundMessage={t("filters.no_results")}
        />
        <Select
          label={t("filters.arrival_airport")}
          placeholder={t("filters.arrival_airport_placeholder")}
          data={arrivalOptions}
          clearable
          searchable
          value={filters.arrivalAirport}
          onChange={(value) => setFilters({ arrivalAirport: value })}
          nothingFoundMessage={t("filters.no_results")}
        />
      </Group>

      <Group grow align="flex-end">
        <Select
          label={t("filters.airline")}
          placeholder={t("filters.airline_placeholder")}
          data={airlineOptions}
          clearable
          searchable
          value={filters.airline}
          onChange={(value) => setFilters({ airline: value })}
          nothingFoundMessage={t("filters.no_results")}
        />
        <div style={{ width: "100%" }}>
          <Text size="sm">{t("filters.duration_label")}</Text>
          <RangeSlider
            color="blue"
            min={DEFAULT_MIN}
            max={DEFAULT_MAX}
            step={0.25}
            value={rangeValue}
            onChange={setRangeValue}
            label={(val) => `${val} hours`}
            onChangeEnd={(value) => {
              // value is [min, max]
              const [minV, maxV] = value as [number, number];
              setFilters({
                minDuration: toNumber(minV),
                maxDuration: toNumber(maxV),
              });
            }}
            marks={[]}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span>{rangeValue[0]}h</span>
            <span>{rangeValue[1]}h</span>
          </div>
        </div>

        <Button
          data-testid="filters-clear"
          variant="light"
          onClick={() => {
            clearFilters();
            // reset year as well
            setSelectedYear(YEAR_FILTER.ALL);
          }}
          disabled={!hasFilters}
        >
          {t("filters.clear")}
        </Button>
      </Group>
    </Stack>
  );
};

export default FlightFilters;
