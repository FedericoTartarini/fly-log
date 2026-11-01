import React from "react";
import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  Indicator,
  RangeSlider,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFilter2 } from "@tabler/icons-react";
import useFlightStore from "../store";
import { useTranslation } from "react-i18next";
import type { enhancedFlight } from "../types/enhancedFlight";
import { useShallow } from "zustand/react/shallow";
import { loadAirportsInfo, type AirportInfo } from "../utils/referenceData";
import { YEAR_FILTER, type YearFilterPreset } from "../constants/filters";
import { getYearValuesFromFlights } from "../utils/yearFilterOptions";
import {
  buildAirlineOptions,
  buildAirportOptions,
} from "../utils/flightFilterOptions";
import {
  type FacetKey,
  filterByDate,
  filterFlightsForFacetOptions,
} from "../utils/flightFilterFacets";
import { DEFAULT_FILTERS, getActiveFilters } from "../utils/activeFilters";
import type { FlightStoreState, StoreFlightFilters } from "../store";

// Flight length slider bounds, in hours.
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 24;
const MONO_INPUT = {
  input: { fontFamily: "var(--mantine-font-family-monospace)" },
};
// How far a finger must drag the sheet's header down to close it.
const SWIPE_CLOSE_PX = 60;

// The header's filter button and the panel it opens: a bottom sheet on
// phones, a side panel on wider screens. Every change applies at once, so the
// pages behind it and the "Show N flights" count stay live.
const FlightFilters: React.FC<{ isPhone: boolean }> = ({ isPhone }) => {
  const { t } = useTranslation("flights");
  const [opened, { open, close }] = useDisclosure(false);
  const swipeStart = React.useRef<number | null>(null);
  const { allFlights, filteredCount, filters, setFilters, clearFilters } =
    useFlightStore(
      useShallow((s: FlightStoreState) => ({
        allFlights: s.allFlights as enhancedFlight[],
        filteredCount: s.filteredFlights.length,
        filters: s.filters as StoreFlightFilters,
        setFilters: s.setFilters,
        clearFilters: s.clearFilters,
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

  // Flights for the chosen When, which set the years on offer.
  const whenFlights = React.useMemo(
    () => filterByDate(allFlights, { ...DEFAULT_FILTERS, when: filters.when }),
    [allFlights, filters.when],
  );
  const years = React.useMemo(
    () => getYearValuesFromFlights(whenFlights).reverse(),
    [whenFlights],
  );

  const flightsForAirlineOptions = React.useMemo(
    () => filterFlightsForFacetOptions(allFlights, filters, "airline"),
    [allFlights, filters],
  );

  const flightsForDepartureOptions = React.useMemo(
    () => filterFlightsForFacetOptions(allFlights, filters, "departureAirport"),
    [allFlights, filters],
  );

  const flightsForArrivalOptions = React.useMemo(
    () => filterFlightsForFacetOptions(allFlights, filters, "arrivalAirport"),
    [allFlights, filters],
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
  }, [allFlights, airportsData, setFilters, filterSignature, filters]);

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

  // A bound at the first or last year is stored as null, so it does not
  // count as a filter.
  const firstYear = years[0];
  const lastYear = years.at(-1);
  const fromYear = filters.fromYear ?? firstYear;
  const toYear = filters.toYear ?? lastYear;
  const yearsLocked = years.length <= 1;
  const yearOptions = (keep: (year: number) => boolean) =>
    years.filter(keep).map(String);
  const whenContext =
    filters.when === YEAR_FILTER.ALL ? undefined : filters.when;
  const yearHint =
    years.length === 0
      ? t("filters.years_none", { context: whenContext })
      : years.length === 1
        ? t("filters.years_single", {
            context: whenContext,
            count: whenFlights.length,
            year: firstYear,
          })
        : t("filters.years_range", {
            context: whenContext,
            from: firstYear,
            to: lastYear,
          });

  const activeCount = getActiveFilters(filters).length;
  const buttonProps = {
    "aria-label": activeCount
      ? t("filters.button_on", { count: activeCount })
      : t("filters.title"),
    "data-cy": "filter-button",
  };

  return (
    <>
      <Indicator
        disabled={activeCount === 0}
        color="var(--fl-accent)"
        size={12}
        offset={isPhone ? 6 : 4}
        withBorder
      >
        {/* A phone's header only has room for the icon. Wider screens add
            the word, so the button is easier to recognise. */}
        {isPhone ? (
          <ActionIcon
            variant="default"
            size={44}
            radius="xl"
            onClick={open}
            {...buttonProps}
          >
            <IconFilter2 size={20} aria-hidden />
          </ActionIcon>
        ) : (
          <Button
            variant="default"
            radius="xl"
            h={44}
            leftSection={<IconFilter2 size={18} aria-hidden />}
            onClick={open}
            {...buttonProps}
          >
            {t("filters.button")}
          </Button>
        )}
      </Indicator>

      <Drawer.Root
        opened={opened}
        onClose={close}
        position={isPhone ? "bottom" : "right"}
        size={isPhone ? "auto" : 420}
        // Above the header (400), which a default drawer opens under.
        zIndex={500}
      >
        <Drawer.Overlay />
        <Drawer.Content
          style={isPhone ? { borderRadius: "20px 20px 0 0" } : undefined}
        >
          {/* Mantine has no swipe to close, so a downward drag on the
              sheet's header closes it. */}
          <Drawer.Header
            pt={isPhone ? 24 : "md"}
            onTouchStart={(event) => {
              swipeStart.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
              const start = swipeStart.current;
              const end = event.changedTouches[0]?.clientY;
              swipeStart.current = null;
              if (start !== null && end !== undefined) {
                if (end - start > SWIPE_CLOSE_PX) close();
              }
            }}
          >
            {isPhone && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  background: "var(--fl-border)",
                }}
              />
            )}
            <Drawer.Title fz={20} fw={600}>
              {t("filters.title")}
            </Drawer.Title>
            <Drawer.CloseButton aria-label={t("filters.close")} />
          </Drawer.Header>

          <Drawer.Body>
            <Stack gap={22}>
              <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
                <Text component="legend" fw={600} mb={8} p={0}>
                  {t("filters.when")}
                </Text>
                <SegmentedControl
                  fullWidth
                  value={filters.when}
                  // A new When changes the years on offer, so the range
                  // starts over.
                  onChange={(value) =>
                    setFilters({
                      when: value as YearFilterPreset,
                      fromYear: null,
                      toYear: null,
                    })
                  }
                  data={[
                    YEAR_FILTER.ALL,
                    YEAR_FILTER.PAST,
                    YEAR_FILTER.UPCOMING,
                  ].map((value) => ({
                    value,
                    label: t(`filters.when_${value}`),
                  }))}
                />
              </fieldset>

              <Stack gap={6}>
                <SimpleGrid cols={2} spacing={12}>
                  <Select
                    label={t("filters.from_year")}
                    data={yearOptions((year) => year <= (toYear ?? year))}
                    value={fromYear ? String(fromYear) : null}
                    onChange={(value) =>
                      setFilters({
                        fromYear:
                          Number(value) === firstYear ? null : Number(value),
                      })
                    }
                    allowDeselect={false}
                    disabled={yearsLocked}
                    aria-describedby="filters-year-hint"
                    styles={MONO_INPUT}
                  />
                  <Select
                    label={t("filters.to_year")}
                    data={yearOptions((year) => year >= (fromYear ?? year))}
                    value={toYear ? String(toYear) : null}
                    onChange={(value) =>
                      setFilters({
                        toYear:
                          Number(value) === lastYear ? null : Number(value),
                      })
                    }
                    allowDeselect={false}
                    disabled={yearsLocked}
                    aria-describedby="filters-year-hint"
                    styles={MONO_INPUT}
                  />
                </SimpleGrid>
                {/* Always present, so the fields below never move. */}
                <Text id="filters-year-hint" size="sm" c="var(--fl-muted)">
                  {yearHint}
                </Text>
              </Stack>

              <Select
                label={t("filters.airline")}
                placeholder={t("filters.airline_placeholder", {
                  count: airlineOptions.length,
                })}
                data={airlineOptions}
                clearable
                searchable
                value={filters.airline}
                onChange={(value) => setFilters({ airline: value })}
                nothingFoundMessage={t("filters.no_results")}
              />

              <SimpleGrid cols={2} spacing={12}>
                <Select
                  label={t("filters.from")}
                  placeholder={t("filters.any_airport")}
                  data={departureOptions}
                  clearable
                  searchable
                  value={filters.departureAirport}
                  onChange={(value) => setFilters({ departureAirport: value })}
                  nothingFoundMessage={t("filters.no_results")}
                />
                <Select
                  label={t("filters.to")}
                  placeholder={t("filters.any_airport")}
                  data={arrivalOptions}
                  clearable
                  searchable
                  value={filters.arrivalAirport}
                  onChange={(value) => setFilters({ arrivalAirport: value })}
                  nothingFoundMessage={t("filters.no_results")}
                />
              </SimpleGrid>

              <Stack gap={10}>
                <Group justify="space-between">
                  <Text fw={600} id="filters-length-label">
                    {t("filters.length")}
                  </Text>
                  <Text ff="monospace">
                    {t("filters.length_range", {
                      min: rangeValue[0],
                      max: rangeValue[1],
                    })}
                  </Text>
                </Group>
                <RangeSlider
                  aria-labelledby="filters-length-label"
                  min={DEFAULT_MIN}
                  max={DEFAULT_MAX}
                  step={0.25}
                  minRange={0}
                  color="var(--fl-ink)"
                  thumbSize={24}
                  value={rangeValue}
                  onChange={setRangeValue}
                  label={(value) => t("filters.hours", { value })}
                  onChangeEnd={([min, max]) =>
                    // The slider's ends mean no limit.
                    setFilters({
                      minDuration: min === DEFAULT_MIN ? null : min,
                      maxDuration: max === DEFAULT_MAX ? null : max,
                    })
                  }
                  mb={8}
                />
              </Stack>
            </Stack>
          </Drawer.Body>

          <Group
            gap={10}
            wrap="nowrap"
            px="md"
            pt={12}
            style={{
              position: "sticky",
              bottom: 0,
              background: "var(--fl-surface)",
              borderTop: "1px solid var(--fl-divider)",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            }}
          >
            <Button
              variant="subtle"
              color="var(--fl-ink)"
              size="md"
              td="underline"
              onClick={clearFilters}
              disabled={activeCount === 0}
            >
              {t("filters.clear_all")}
            </Button>
            <Button radius="xl" size="md" h={48} flex={1} onClick={close}>
              {t("filters.show", { count: filteredCount })}
            </Button>
          </Group>
        </Drawer.Content>
      </Drawer.Root>
    </>
  );
};

export default FlightFilters;
