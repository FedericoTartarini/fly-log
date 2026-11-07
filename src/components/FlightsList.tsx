import React, { lazy, Suspense } from "react";
import {
  Avatar,
  Group,
  Text,
  Modal,
  Loader,
  Stack,
  UnstyledButton,
} from "@mantine/core";
import { useHeadroom } from "@mantine/hooks";
import { IconArrowRight, IconPlaneInflight } from "@tabler/icons-react";
import useFlightStore from "../store";
import type { enhancedFlight } from "../types/enhancedFlight";
import { formatCalendarDate } from "../utils/dateUtils";
import { getAirportCity } from "../utils/airportUtils";
import { groupFlightsByYear } from "../utils/groupFlights";
import { useTranslation } from "react-i18next";
import type { FlightStoreState } from "../store";
import classes from "./FlightsList.module.css";

const FlightEntryForm = lazy(() => import("./FlightEntryForm"));
const FlightDetailsModal = lazy(() => import("./FlightDetailsModal"));

const flightNumberOf = (flight: enhancedFlight): string | null =>
  flight.flight_number
    ? `${flight.airline_iata ?? ""}${flight.flight_number}`
    : null;

const FlightModalTitle: React.FC<{ flight: enhancedFlight }> = ({ flight }) => {
  const flightNumber = flightNumberOf(flight);
  const identity =
    flightNumber ??
    flight.airline_name ??
    `${flight.departure_airport_iata} → ${flight.arrival_airport_iata}`;

  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar
        src={
          flight.airline_icon_path
            ? `/logos/${flight.airline_icon_path}`
            : undefined
        }
        alt=""
        color="gray"
        radius="xl"
        size="sm"
      >
        <IconPlaneInflight size={16} />
      </Avatar>
      <Text fw={600} size="lg">
        {identity}
        {flightNumber && flight.airline_name ? ` · ${flight.airline_name}` : ""}
      </Text>
    </Group>
  );
};

/**
 * One flight as a two-line boarding-pass row. The whole row is one button
 * that opens the details, and its accessible name reads the whole flight.
 */
const FlightRow: React.FC<{
  flight: enhancedFlight;
  upcoming: boolean;
  onOpen: (flight: enhancedFlight) => void;
}> = ({ flight, upcoming, onOpen }) => {
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
        <span className={classes.date} data-upcoming={upcoming || undefined}>
          {formatCalendarDate(flight.departure_date, "D MMM")}
        </span>
        {flightNumber && <span className={classes.number}>{flightNumber}</span>}
      </span>
    </UnstyledButton>
  );
};

/**
 * The filtered flights as one long list, grouped by year with upcoming
 * flights first. Each group's heading stays pinned while its rows scroll.
 */
const FlightsList: React.FC = () => {
  const filteredFlights = useFlightStore(
    (s: FlightStoreState) => s.filteredFlights as enhancedFlight[],
  );

  const { t, i18n } = useTranslation("flights");
  // Same headroom as the app shell, so a pinned heading sits under the
  // header while it shows and moves up when it hides.
  const headerPinned = useHeadroom({ fixedAt: 120 });
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

  const groups = React.useMemo(
    () => groupFlightsByYear(filteredFlights),
    [filteredFlights],
  );

  const openDetails = (flight: enhancedFlight) => {
    setDetailsFlightId(flight.id);
    setDetailsOpen(true);
  };

  return (
    <Stack gap="md">
      {groups.length === 0 ? (
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
        title={detailsFlight ? <FlightModalTitle flight={detailsFlight} /> : ""}
        size="lg"
        zIndex={600}
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
