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
} from "@mantine/core";
import { IconPlaneInflight } from "@tabler/icons-react";
import useFlightStore from "../store";
import type { enhancedFlight } from "../types/enhancedFlight";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";

const FlightActions = lazy(() => import("./FlightActions.jsx"));
const FlightEntryForm = lazy(() => import("./FlightEntryForm"));

/**
 * Renders a list of flights in a table.
 * @returns {JSX.Element}
 */
const FlightsList: React.FC = () => {
  // The store's Flight type differs from enhancedFlight; cast via unknown to satisfy TypeScript
  const { filteredFlights } = useFlightStore() as unknown as {
    filteredFlights: enhancedFlight[];
  };

  const { t } = useTranslation("flights");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editFlight, setEditFlight] = React.useState<any>(null);
  const fetchFlights = useFlightStore((s: any) => s.fetchFlights);

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

  if (filteredFlights.length === 0) {
    return (
      <Text mt="md" ta="center">
        {t("no_flights")}
      </Text>
    );
  }

  // Helper to get epoch ms for various departure_date representations
  const getDepartureEpoch = (flight: any): number => {
    const d = flight?.departure_date;
    if (!d) return -Infinity;
    // Firestore Timestamp-like object with toDate()
    if (typeof d?.toDate === "function") {
      try {
        const dt = d.toDate();
        if (dt instanceof Date && !isNaN(dt.getTime())) return dt.getTime();
      } catch (e) {
        // fallthrough
      }
    }
    // If object with seconds property
    if (typeof d === "object" && typeof d.seconds === "number") {
      return d.seconds * 1000;
    }
    // Date instance
    if (d instanceof Date) {
      const t = d.getTime();
      return isNaN(t) ? -Infinity : t;
    }
    // string or number
    if (typeof d === "string" || typeof d === "number") {
      const t = new Date(d).getTime();
      return isNaN(t) ? -Infinity : t;
    }
    return -Infinity;
  };

  // Sort flights by departure date descending (newest first)
  const sortedFlights = [...filteredFlights].sort(
    (a, b) => getDepartureEpoch(b) - getDepartureEpoch(a),
  );

  // compute the flights to show on the current page (after sorting)
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedFlights = sortedFlights.slice(startIndex, endIndex);

  /**
   * Returns the airline icon or a fallback icon.
   * @param {Flight} flight
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

    // Try to build a local/build URL for the image, falling back to public path
    let imageUrl: string;
    // new URL with import.meta may cause TypeScript to complain in some build configs; ignore the TS check here
    // @ts-ignore
    imageUrl = new URL(`../assets/logos/${sourcePath}`, import.meta.url).href;
    // Fallback to a public path (if assets are copied to /assets at build)
    // imageUrl = `/assets/logos/${sourcePath}`;

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
    <>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              <Center>{t("table.icon")}</Center>
            </Table.Th>
            <Table.Th>{t("table.from_to")}</Table.Th>
            <Table.Th>{t("table.date_duration_distance")}</Table.Th>
            <Table.Th>{t("table.actions")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paginatedFlights.map((flight) => {
            const departureDateStr = formatDate(flight.departure_date);

            // Safe formatting for flight time and distance
            const ft = flight.flight_time ?? null;
            const dist = Number.isFinite(flight.distance_km)
              ? Math.round(flight.distance_km)
              : null;
            let durationDistanceStr = "";
            if (ft !== null) {
              const hours = Math.floor(ft);
              const minutes = Math.round((ft % 1) * 60);
              if (dist !== null) {
                durationDistanceStr = `${hours}h ${minutes}m, ${dist.toLocaleString()} km`;
              } else {
                durationDistanceStr = `${hours}h ${minutes}m`;
              }
            } else if (dist !== null) {
              durationDistanceStr = `${dist.toLocaleString()} km`;
            }

            return (
              <Table.Tr key={flight.id}>
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
                    {flight.flight_number ? `: ${flight.flight_number}` : ""}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{departureDateStr}</Text>
                  <Text size="xs" c="dimmed">
                    {durationDistanceStr}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Suspense fallback={<Loader size="sm" />}>
                    <FlightActions
                      flight={flight}
                      onEdit={(f: any) => {
                        setEditFlight(f);
                        setEditOpen(true);
                      }}
                    />
                  </Suspense>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {/* Pagination control (Mantine) */}
      {totalPages > 1 && (
        <Center mt="md">
          <Pagination total={totalPages} value={page} onChange={setPage} />
        </Center>
      )}

      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("form.labels.edit_flight")}
      >
        {editFlight && (
          <Suspense fallback={<Loader size="sm" />}>
            <FlightEntryForm
              flight={editFlight}
              onSaved={async () => {
                setEditOpen(false);
                // refresh flights list
                try {
                  await fetchFlights();
                } catch (e) {
                  console.error("Failed to refresh flights:", e);
                }
              }}
            />
          </Suspense>
        )}
      </Modal>
    </>
  );
};

export default FlightsList;
