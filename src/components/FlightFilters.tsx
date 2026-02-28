import React from "react";
import {
  Button,
  Box,
  SimpleGrid,
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
import {
  type FacetKey,
  filterFlightsForFacetOptions,
} from "../utils/flightFilterFacets";
import type { FlightStoreState, StoreFlightFilters } from "../store";

const FlightFilters: React.FC = () => {
  const { t } = useTranslation("flights");
  const {
    allFlights,
    filters,
    setFilters,
    clearFilters,
    selectedYear,
    setSelectedYear,
  } = useFlightStore(
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
    loadAirportsInfo()
      .then((data) => {
        if (mounted) setAirportsData(data);
      })
      .catch((error) => {
        console.error("Error loading airports info:", error);
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
    () =>
      filterFlightsForFacetOptions(
        allFlights,
        selectedYear,
        filters,
        "airline",
      ),
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

  const filterSignature = React.useMemo(
    () => JSON.stringify(filters),
    [filters],
  );
  const pendingValidationKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (pendingValidationKeyRef.current === filterSignature) {
      pendingValidationKeyRef.current = null;
      return;
    }

    const nextFilters: StoreFlightFilters = { ...filters };

    const isFacetValueValid = (facet: FacetKey): boolean => {
      if (facet === "airline" && !nextFilters.airline) return true;
      if (facet === "departureAirport" && !nextFilters.departureAirport) {
        return true;
      }
      if (facet === "arrivalAirport" && !nextFilters.arrivalAirport)
        return true;

      const facetFlights = filterFlightsForFacetOptions(
        allFlights,
        selectedYear,
        nextFilters,
        facet,
      );

      if (facet === "airline") {
        const facetOptions = buildAirlineOptions(facetFlights);
        return facetOptions.some(
          (option) => option.value === nextFilters.airline,
        );
      }

      if (facet === "departureAirport") {
        const facetOptions = buildAirportOptions(
          facetFlights,
          airportsData,
          "departure_airport_iata",
        );
        return facetOptions.some(
          (option) => option.value === nextFilters.departureAirport,
        );
      }

      const facetOptions = buildAirportOptions(
        facetFlights,
        airportsData,
        "arrival_airport_iata",
      );
      return facetOptions.some(
        (option) => option.value === nextFilters.arrivalAirport,
      );
    };

    let changed = false;
    const validationOrder: FacetKey[] = [
      "arrivalAirport",
      "airline",
      "departureAirport",
    ];

    validationOrder.forEach((facet) => {
      if (isFacetValueValid(facet)) return;
      changed = true;
      if (facet === "airline") nextFilters.airline = null;
      if (facet === "departureAirport") nextFilters.departureAirport = null;
      if (facet === "arrivalAirport") nextFilters.arrivalAirport = null;
    });

    if (!changed) return;

    const patch: Partial<StoreFlightFilters> = {};
    if (nextFilters.airline !== filters.airline) {
      patch.airline = nextFilters.airline;
    }
    if (nextFilters.departureAirport !== filters.departureAirport) {
      patch.departureAirport = nextFilters.departureAirport;
    }
    if (nextFilters.arrivalAirport !== filters.arrivalAirport) {
      patch.arrivalAirport = nextFilters.arrivalAirport;
    }

    if (Object.keys(patch).length > 0) {
      pendingValidationKeyRef.current = JSON.stringify({
        ...filters,
        ...patch,
      });
      setFilters(patch);
    }
  }, [
    allFlights,
    selectedYear,
    airportsData,
    setFilters,
    filterSignature,
    filters,
  ]);

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
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return (
    <Stack gap="xs">
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md" verticalSpacing="md">
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
        <Box>
          <Text size="sm">{t("filters.duration_label")}</Text>
          <RangeSlider
            min={DEFAULT_MIN}
            max={DEFAULT_MAX}
            step={0.25}
            value={rangeValue}
            onChange={setRangeValue}
            label={(val) => `${val} ${t("filters.hours")}`}
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
            <span>
              {rangeValue[0]}
              {t("filters.hour_abbrev")}
            </span>
            <span>
              {rangeValue[1]}
              {t("filters.hour_abbrev")}
            </span>
          </div>
        </Box>
        <Box style={{ display: "flex", alignItems: "flex-end" }}>
          <Button
            data-testid="filters-clear"
            variant="light"
            fullWidth
            onClick={() => {
              clearFilters();
              // reset year as well
              setSelectedYear(YEAR_FILTER.ALL);
            }}
            disabled={!hasFilters}
          >
            {t("filters.clear")}
          </Button>
        </Box>
      </SimpleGrid>
    </Stack>
  );
};

export default FlightFilters;
