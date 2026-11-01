import React from "react";
import { Button, Group, Pill } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store.ts";
import { FILTER_RESETS, getActiveFilters } from "../utils/activeFilters.ts";
import classes from "./BoardingPass.module.css";

// One dark tag per filter that is on, each with its own ×, and "Clear all"
// at the end. Renders nothing while no filter is on.
function FilterTags() {
  const { t } = useTranslation("flights");
  const { filters, allFlights, setFilters, clearFilters } = useFlightStore(
    useShallow((s) => ({
      filters: s.filters,
      allFlights: s.allFlights,
      setFilters: s.setFilters,
      clearFilters: s.clearFilters,
    })),
  );
  const active = getActiveFilters(filters);
  if (!active.length) return null;

  const { fromYear, toYear } = filters;
  const years =
    fromYear === null
      ? t("filters.tag_years_to", { value: toYear })
      : toYear === null
        ? t("filters.tag_years_from", { value: fromYear })
        : fromYear === toYear
          ? String(fromYear)
          : `${fromYear}–${toYear}`;
  const labels = {
    when: t(`filters.when_${filters.when}`),
    years,
    // The filter holds the IATA code, or the name when a flight has no code.
    airline:
      allFlights.find((f) => f.airline_iata === filters.airline)
        ?.airline_name ?? filters.airline,
    departureAirport: t("filters.tag_from", {
      value: filters.departureAirport,
    }),
    arrivalAirport: t("filters.tag_to", { value: filters.arrivalAirport }),
    duration: t("filters.length_range", {
      min: filters.minDuration ?? 0,
      max: filters.maxDuration ?? 24,
    }),
  };

  return (
    <Group
      role="group"
      aria-label={t("filters.active")}
      gap={8}
      className={classes.tags}
    >
      {active.map((key) => (
        <Pill
          key={key}
          withRemoveButton
          onRemove={() => setFilters(FILTER_RESETS[key])}
          // Mantine hides the × from the keyboard and screen readers, which
          // suits a pill in an input but not a tag that stands alone.
          removeButtonProps={{
            tabIndex: 0,
            "aria-hidden": false,
            "aria-label": t("filters.remove", { name: labels[key] }),
          }}
          classNames={{ root: classes.tag, remove: classes.tagRemove }}
        >
          {labels[key]}
        </Pill>
      ))}
      <Button
        variant="subtle"
        color="var(--fl-ink)"
        size="compact-md"
        td="underline"
        ml="auto"
        onClick={clearFilters}
      >
        {t("filters.clear_all")}
      </Button>
    </Group>
  );
}

export default FilterTags;
