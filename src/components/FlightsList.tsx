import React, { lazy, Suspense } from "react";
import {
  Avatar,
  Group,
  Text,
  Modal,
  Loader,
  Stack,
  NativeSelect,
  TextInput,
  Button,
  UnstyledButton,
} from "@mantine/core";
import { useHeadroom, useMediaQuery } from "@mantine/hooks";
import {
  IconArrowRight,
  IconPlaneInflight,
  IconSearch,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store";
import type { enhancedFlight } from "../types/enhancedFlight";
import { formatCalendarDate } from "../utils/dateUtils";
import { getAirportCity } from "../utils/airportUtils";
import { groupFlights, type FlightSort } from "../utils/groupFlights";
import { searchFlights } from "../utils/searchFlights";
import { getActiveFilters } from "../utils/activeFilters";
import { useTranslation } from "react-i18next";
import type { FlightStoreState } from "../store";
import classes from "./FlightsList.module.css";

const FlightEntryForm = lazy(() => import("./FlightEntryForm"));
const FlightDetailsModal = lazy(() => import("./FlightDetailsModal"));

const flightNumberOf = (flight: enhancedFlight): string | null =>
  flight.flight_number
    ? `${flight.airline_iata ?? ""}${flight.flight_number}`
    : null;

/**
 * One flight as a two-line boarding-pass row. The whole row is one button
 * that opens the details, and its accessible name reads the whole flight.
 */
const FlightRow: React.FC<{
  flight: enhancedFlight;
  upcoming: boolean;
  /** Distance sorts show the distance, then the date with its year. */
  byDistance?: boolean;
  onOpen: (flight: enhancedFlight) => void;
}> = ({ flight, upcoming, byDistance = false, onOpen }) => {
  const { t, i18n } = useTranslation("flights");
  const from = getAirportCity(flight.departure_airport_iata);
  const to = getAirportCity(flight.arrival_airport_iata);
  const flightNumber = flightNumberOf(flight);
  const km =
    typeof flight.distance_km === "number" &&
    Number.isFinite(flight.distance_km)
      ? t("km", {
          value: Math.round(flight.distance_km).toLocaleString(i18n.language),
        })
      : null;
  const label = [
    t("list.cities", { from, to }),
    formatCalendarDate(flight.departure_date, "D MMM YYYY"),
    [flight.airline_name, flightNumber].filter(Boolean).join(" "),
    km,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <UnstyledButton
      className={classes.row}
      onClick={() => onOpen(flight)}
      aria-label={label}
      data-testid={`flight-row-${flight.id}`}
    >
      <Avatar
        src={
          flight.airline_icon_path
            ? `/logos/${flight.airline_icon_path}`
            : undefined
        }
        alt=""
        radius="xl"
        size={36}
        className={classes.logo}
        aria-hidden
      >
        {flight.airline_iata || <IconPlaneInflight size={18} />}
      </Avatar>
      <span className={classes.route} aria-hidden>
        <span className={classes.codes}>
          {flight.departure_airport_iata}
          <IconArrowRight size={16} stroke={2.4} className={classes.arrow} />
          {flight.arrival_airport_iata}
        </span>
        <span className={classes.cities}>{t("list.cities", { from, to })}</span>
      </span>
      <span className={classes.when} aria-hidden>
        {byDistance ? (
          <>
            <span className={classes.date}>{km}</span>
            <span className={classes.number}>
              {formatCalendarDate(flight.departure_date, "D MMM YYYY")}
            </span>
          </>
        ) : (
          <>
            <span
              className={classes.date}
              data-upcoming={upcoming || undefined}
            >
              {formatCalendarDate(flight.departure_date, "D MMM")}
            </span>
            {flightNumber && (
              <span className={classes.number}>{flightNumber}</span>
            )}
          </>
        )}
      </span>
    </UnstyledButton>
  );
};

/**
 * The filtered flights as one long list, grouped by year with upcoming
 * flights first. Each group's heading stays pinned while its rows scroll.
 * The search box narrows the filtered flights and never changes the filters.
 */
const FlightsList: React.FC = () => {
  const { filteredFlights, filtered, clearFilters } = useFlightStore(
    useShallow((s: FlightStoreState) => ({
      filteredFlights: s.filteredFlights as enhancedFlight[],
      filtered: getActiveFilters(s.filters).length > 0,
      clearFilters: s.clearFilters,
    })),
  );
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<FlightSort>("newest");
  const inputRef = React.useRef<HTMLInputElement>(null);
  // The no-match buttons vanish once pressed, so focus returns to the search box.
  const refocus = () => inputRef.current?.focus();

  const { t, i18n } = useTranslation("flights");
  // Same headroom as the app shell, so a pinned heading sits under the
  // header while it shows and moves up when it hides.
  const headerPinned = useHeadroom({ fixedAt: 120 });
  const isPhone = useMediaQuery("(max-width: 53.74em)");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editFlight, setEditFlight] = React.useState<enhancedFlight | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsFlightId, setDetailsFlightId] = React.useState<string | null>(
    null,
  );
  // Derived from the live list, not snapshotted, so a status write lands in
  // the open modal. The flip side is that the flight can vanish underneath it
  // (deleted, or filtered out), which would leave an empty titled modal open.
  const detailsFlight =
    filteredFlights.find((f) => f.id === detailsFlightId) ?? null;
  React.useEffect(() => {
    if (detailsOpen && detailsFlightId !== null && detailsFlight === null) {
      setDetailsOpen(false);
    }
  }, [detailsOpen, detailsFlightId, detailsFlight]);

  const hits = React.useMemo(
    () => searchFlights(filteredFlights, query),
    [filteredFlights, query],
  );
  const groups = React.useMemo(() => groupFlights(hits, sort), [hits, sort]);
  const byDistance = sort === "longest" || sort === "shortest";
  const searching = query.trim() !== "";

  const openDetails = (flight: enhancedFlight) => {
    setDetailsFlightId(flight.id);
    setDetailsOpen(true);
  };

  return (
    <Stack gap="md">
      <div role="search">
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <TextInput
            style={{ flex: 1, minWidth: 0 }}
            ref={inputRef}
            type="search"
            size="md"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            aria-label={t(
              filtered ? "list.search_label_filtered" : "list.search_label",
            )}
            placeholder={
              filtered
                ? t("list.search_placeholder_filtered", {
                    count: filteredFlights.length,
                  })
                : t("list.search_placeholder")
            }
            leftSection={<IconSearch size={18} aria-hidden />}
            autoComplete="off"
          />
          <NativeSelect
            size="md"
            aria-label={t("list.sort_label")}
            value={sort}
            onChange={(event) =>
              setSort(event.currentTarget.value as FlightSort)
            }
            data={(["newest", "oldest", "longest", "shortest"] as const).map(
              (value) => ({ value, label: t(`list.sort_${value}`) }),
            )}
          />
        </Group>
        {/* Always rendered, so screen readers announce each new count. */}
        <Text aria-live="polite" size="sm" c="var(--fl-muted)" mt={4}>
          {searching &&
            t(filtered ? "list.matches_filtered" : "list.matches", {
              count: hits.length,
              query: query.trim(),
              // React escapes the text already; i18next would show "&" as "&amp;".
              interpolation: { escapeValue: false },
            })}
        </Text>
      </div>

      {searching && hits.length === 0 ? (
        <Stack gap="sm" align="flex-start" className={classes.noMatch}>
          <Text fw={600}>
            {t("list.no_match", {
              query: query.trim(),
              interpolation: { escapeValue: false },
            })}
          </Text>
          <Text c="var(--fl-muted)">
            {t(filtered ? "list.no_match_filtered" : "list.no_match_hint")}
          </Text>
          <Group gap="xs">
            <Button
              variant="default"
              onClick={() => {
                setQuery("");
                refocus();
              }}
            >
              {t("list.clear_search")}
            </Button>
            {filtered && (
              <Button
                color="var(--fl-ink)"
                c="var(--fl-surface)"
                onClick={() => {
                  clearFilters();
                  refocus();
                }}
              >
                {t("list.search_all")}
              </Button>
            )}
          </Group>
        </Stack>
      ) : groups.length === 0 ? (
        <Text mt="md" ta="center">
          {t("no_flights")}
        </Text>
      ) : (
        groups.map((group) => {
          const id = `flights-${group.key ?? "undated"}`;
          return (
            <section key={id} aria-labelledby={id}>
              <h2
                id={id}
                className={classes.heading}
                style={{
                  top: headerPinned ? "var(--app-shell-header-height)" : 0,
                }}
              >
                <span
                  className={classes.year}
                  data-upcoming={group.key === "upcoming" || undefined}
                >
                  {group.key === "upcoming"
                    ? t("list.upcoming")
                    : group.key === "longest" || group.key === "shortest"
                      ? t(`list.${group.key}_first`)
                      : (group.key ?? t("list.no_date"))}
                </span>
                <span className={classes.summary}>
                  {t("list.summary", {
                    count: group.flights.length,
                    km: Math.round(group.km).toLocaleString(i18n.language),
                  })}
                </span>
              </h2>
              <ul className={classes.list}>
                {group.flights.map((flight) => (
                  <li key={flight.id}>
                    <FlightRow
                      flight={flight}
                      upcoming={group.key === "upcoming"}
                      byDistance={byDistance}
                      onOpen={openDetails}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("form.labels.edit_flight")}
        // Only the page colour of the details sheet, not its phone layout.
        classNames={{
          content: classes.sheetHeader,
          header: classes.sheetHeader,
        }}
        // Opened from inside the details modal below, so it must stack above
        // it regardless of DOM order - Mantine gives every Modal the same
        // default z-index (200), and same-z-index elements paint in DOM
        // order, which would otherwise put the later (details) modal on top.
        zIndex={1000}
      >
        {editFlight && (
          <Suspense fallback={<Loader size="sm" />}>
            <FlightEntryForm
              flight={editFlight}
              onSaved={() => setEditOpen(false)}
            />
          </Suspense>
        )}
      </Modal>

      <Modal
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={
          detailsFlight
            ? t("list.cities", {
                from:
                  getAirportCity(detailsFlight.departure_airport_iata) ??
                  detailsFlight.departure_airport_iata,
                to:
                  getAirportCity(detailsFlight.arrival_airport_iata) ??
                  detailsFlight.arrival_airport_iata,
              })
            : ""
        }
        size="lg"
        zIndex={600}
        // A sheet from the bottom on phones, a centred modal on wider screens.
        {...(isPhone && { transitionProps: { transition: "slide-up" } })}
        closeButtonProps={{ size: "lg" }}
        classNames={{
          inner: classes.sheetInner,
          content: classes.sheet,
          header: classes.sheetHeader,
          title: classes.sheetTitle,
        }}
      >
        {detailsFlight && (
          <Suspense fallback={<Loader size="sm" />}>
            <FlightDetailsModal
              flight={detailsFlight}
              onEdit={(f) => {
                setEditFlight(f);
                setEditOpen(true);
              }}
            />
          </Suspense>
        )}
      </Modal>
    </Stack>
  );
};

export default FlightsList;
