import React, { lazy, Suspense } from "react";
import {
  Image,
  Table,
  Text,
  ActionIcon,
  Center,
  Modal,
  Pagination,
  Loader,
  Stack,
} from "@mantine/core";
import { IconPlaneInflight } from "@tabler/icons-react";
import useFlightStore from "../store";
import type { enhancedFlight } from "../types/enhancedFlight";
import { formatCalendarDate, parseToDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";
import type { FlightStoreState } from "../store";

const FlightEntryForm = lazy(() => import("./FlightEntryForm"));
const FlightDetailsModal = lazy(() => import("./FlightDetailsModal"));

/**
 * Renders a paginated list of flights in a table.
 */
const FlightsList: React.FC = () => {
  const filteredFlights = useFlightStore(
    (s: FlightStoreState) => s.filteredFlights as enhancedFlight[],
  );

  const { t } = useTranslation("flights");
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

  const PAGE_SIZE = 20;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredFlights.length / PAGE_SIZE));

  // reset to first page if filteredFlights changes (e.g., new fetch or filter applied)
  const filterKey = React.useMemo(
    () => JSON.stringify(filteredFlights.map((f) => f.id).sort()),
    [filteredFlights],
  );
  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const [failedImages, setFailedImages] = React.useState(new Set<string>());

  const hasResults = filteredFlights.length > 0;

  // Helper to get epoch ms for various departure_date representations
  const getDepartureEpoch = (flight: enhancedFlight): number => {
    const dt = parseToDate(flight?.departure_date);
    if (!dt) return -Infinity;
    const t = dt.getTime();
    return isNaN(t) ? -Infinity : t;
  };

  // Sort flights by departure date descending (newest first)
  const sortedFlights = [...filteredFlights].sort(
    (a, b) => getDepartureEpoch(b) - getDepartureEpoch(a),
  );

  // compute the flights to show on the current page (after sorting)
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedFlights = sortedFlights.slice(startIndex, endIndex);

  const openDetails = (flight: enhancedFlight) => {
    setDetailsFlightId(flight.id);
    setDetailsOpen(true);
  };

  /**
   * Returns the airline icon or a fallback icon.
   * @param {enhancedFlight} flight
   * @returns {JSX.Element}
   */
  const getAirlineIcon = (flight: enhancedFlight): React.ReactElement => {
    if (failedImages.has(flight.id)) {
      return (
        <ActionIcon
          aria-label={`${flight.airline_name || flight.airline_iata || "Airline"} icon`}
          color="gray"
        >
          <IconPlaneInflight
            style={{ width: "70%", height: "70%" }}
            stroke={1.5}
          />
        </ActionIcon>
      );
    }

    const sourcePath = flight.airline_icon_path;

    if (!sourcePath) {
      return (
        <ActionIcon
          aria-label={`${flight.airline_name || flight.airline_iata || "Airline"} icon`}
          color="gray"
        >
          <IconPlaneInflight
            style={{ width: "70%", height: "70%" }}
            stroke={1.5}
          />
        </ActionIcon>
      );
    }

    const imageUrl = `/logos/${sourcePath}`;

    // Provide a safe fallback image using onError to swap src to the airlines_info icon, then to a generic default
    return (
      <Image
        src={imageUrl}
        alt={`${flight.airline_name ?? ""} icon`}
        h={50}
        w="auto"
        fit="contain"
        loading="lazy"
        p={4}
        onError={() => setFailedImages((prev) => new Set(prev).add(flight.id))}
      />
    );
  };

  return (
    <Stack gap="md">
      {!hasResults ? (
        <Text mt="md" ta="center">
          {t("no_flights")}
        </Text>
      ) : (
        <>
          <Table striped highlightOnHover withTableBorder layout="fixed">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: "4rem" }}>
                  <Center>{t("table.icon")}</Center>
                </Table.Th>
                <Table.Th style={{ width: "38%" }}>
                  {t("table.from_to")}
                </Table.Th>
                <Table.Th>{t("table.date_duration_distance")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedFlights.map((flight) => {
                const departureDateStr = formatCalendarDate(
                  flight.departure_date,
                );

                // Safe formatting for flight time and distance
                const ft = flight.flight_time ?? null;
                const distValue =
                  typeof flight.distance_km === "number"
                    ? flight.distance_km
                    : null;
                const dist =
                  distValue !== null && Number.isFinite(distValue)
                    ? Math.round(distValue)
                    : null;
                let durationDistanceStr = "";
                if (ft !== null) {
                  let hours = Math.floor(ft);
                  let minutes = Math.round((ft % 1) * 60);
                  if (minutes === 60) {
                    hours += 1;
                    minutes = 0;
                  }
                  if (dist !== null) {
                    durationDistanceStr = `${hours}h ${minutes}m, ${dist.toLocaleString()} km`;
                  } else {
                    durationDistanceStr = `${hours}h ${minutes}m`;
                  }
                } else if (dist !== null) {
                  durationDistanceStr = `${dist.toLocaleString()} km`;
                }

                const rowLabel = t("table.view_row_details", {
                  from: flight.departure_airport_iata,
                  to: flight.arrival_airport_iata,
                });

                return (
                  <Table.Tr
                    key={flight.id}
                    onClick={() => openDetails(flight)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetails(flight);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={rowLabel}
                    style={{ cursor: "pointer" }}
                    data-testid={`flight-row-${flight.id}`}
                  >
                    <Table.Td p={"0.5rem"}>
                      <Center>{getAirlineIcon(flight)}</Center>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {flight.departure_airport_iata} →{" "}
                        {flight.arrival_airport_iata}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {flight.airline_iata || flight.airline_name}{" "}
                        {flight.flight_number
                          ? `: ${flight.flight_number}`
                          : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {departureDateStr}
                        {flight.departure_time
                          ? `, ${flight.departure_time}`
                          : ""}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {durationDistanceStr}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {/* Pagination control */}
          {totalPages > 1 && (
            <Center mt="md">
              <Pagination total={totalPages} value={page} onChange={setPage} />
            </Center>
          )}
        </>
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
        title={
          detailsFlight
            ? `${detailsFlight.departure_airport_iata} → ${detailsFlight.arrival_airport_iata}`
            : ""
        }
        size="lg"
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
