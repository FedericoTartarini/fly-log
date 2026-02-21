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
import { parseToDate } from "../utils/dateUtils";
import { loadAirportsInfo } from "../utils/referenceData";
import { YEAR_FILTER } from "../constants/filters";

type Option = { value: string; label: string };

const FlightFilters: React.FC = () => {
  const { t } = useTranslation("flights");
  const allFlights = useFlightStore(
    (s: any) => s.allFlights,
  ) as enhancedFlight[];
  const filters = useFlightStore((s: any) => s.filters) as {
    airline: string | null;
    departureAirport: string | null;
    arrivalAirport: string | null;
    minDuration: number | null;
    maxDuration: number | null;
  };
  const setFilters = useFlightStore((s: any) => s.setFilters);
  const clearFilters = useFlightStore((s: any) => s.clearFilters);
  const selectedYear = useFlightStore((s: any) => s.selectedYear);
  const setSelectedYear = useFlightStore((s: any) => s.setSelectedYear);
  const [airportsData, setAirportsData] = React.useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;
    loadAirportsInfo().then((data) => {
      if (mounted) setAirportsData(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // build year options from allFlights (same logic as FlightYearFilter)
  const yearsSet = React.useMemo(() => {
    const set = new Set<number>();
    allFlights.forEach((flight) => {
      const dt = parseToDate((flight as any).departure_date);
      if (!dt) return;
      set.add(dt.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [allFlights]);

  const airlineOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    allFlights.forEach((flight) => {
      if (flight.airline_iata) {
        const label = flight.airline_name
          ? `${flight.airline_iata} - ${flight.airline_name}`
          : flight.airline_iata;
        map.set(flight.airline_iata, label);
      } else if (flight.airline_name) {
        map.set(flight.airline_name, flight.airline_name);
      }
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allFlights]);

  const departureOptions = React.useMemo(() => {
    const iataSet = new Set<string>();
    allFlights.forEach((flight) => {
      if (flight.departure_airport_iata) {
        iataSet.add(flight.departure_airport_iata);
      }
    });

    // Prefer detailed labels from airportsInfo when available
    const options: Option[] = [];
    airportsData.forEach((airport: any) => {
      if (iataSet.has(airport.iata)) {
        options.push({
          value: airport.iata,
          label: `${airport.iata} - ${airport.airport_name}, ${airport.city}, ${airport.country}`,
        });
      }
    });

    // Fall back to any iata not present in airportsInfo
    iataSet.forEach((iata) => {
      if (!options.find((o) => o.value === iata)) {
        options.push({ value: iata, label: iata });
      }
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [allFlights, airportsData]);

  const arrivalOptions = React.useMemo(() => {
    const iataSet = new Set<string>();
    allFlights.forEach((flight) => {
      if (flight.arrival_airport_iata) {
        iataSet.add(flight.arrival_airport_iata);
      }
    });

    const options: Option[] = [];
    airportsData.forEach((airport: any) => {
      if (iataSet.has(airport.iata)) {
        options.push({
          value: airport.iata,
          label: `${airport.iata} - ${airport.airport_name}, ${airport.city}, ${airport.country}`,
        });
      }
    });

    iataSet.forEach((iata) => {
      if (!options.find((o) => o.value === iata)) {
        options.push({ value: iata, label: iata });
      }
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [allFlights, airportsData]);

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
          data={[
            { value: YEAR_FILTER.ALL, label: t("filter.all") },
            { value: YEAR_FILTER.UPCOMING, label: t("filter.upcoming") },
            { value: YEAR_FILTER.PAST, label: t("filter.past") },
            ...yearsSet.map((year) => ({
              value: String(year),
              label: String(year),
            })),
          ]}
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
