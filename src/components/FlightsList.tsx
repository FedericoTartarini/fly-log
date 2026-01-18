import React from "react";
import {
  Image,
  Table,
  Text,
  ActionIcon,
  Center,
  Modal,
  Pagination,
} from "@mantine/core";
import { IconPlaneInflight } from "@tabler/icons-react";
import useFlightStore from "../store";
import FlightActions from "./FlightActions.jsx";
import FlightEntryForm from "./FlightEntryForm";
import type { enhancedFlight } from "../types/enhancedFlight";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";
import airlinesInfo from "../assets/airlines.json";

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
  React.useEffect(() => {
    setPage(1);
  }, [filteredFlights.length]);

  if (filteredFlights.length === 0) {
    return (
      <Text mt="md" ta="center">
        {t("no_flights")}
      </Text>
    );
  }

  // compute the flights to show on the current page
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedFlights = filteredFlights.slice(startIndex, endIndex);

  /**
   * Returns the airline icon or a fallback icon.
   * @param {Flight} flight
   * @returns {JSX.Element}
   */
  const getAirlineIcon = (flight: enhancedFlight): React.ReactElement => {
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
    try {
      // new URL with import.meta may cause TypeScript to complain in some build configs; ignore the TS check here
      // @ts-ignore
      imageUrl = new URL(`../assets/logos/${sourcePath}`, import.meta.url).href;
    } catch (e) {
      // Fallback to a public path (if assets are copied to /assets at build)
      imageUrl = `/assets/logos/${sourcePath}`;
    }

    // Determine IATA code to lookup in airlinesInfo: prefer flight.airline_iata, otherwise derive from filename
    let iataLookup = (flight.airline_iata || "")
      .toString()
      .trim()
      .toUpperCase();
    if (!iataLookup && sourcePath) {
      // Safely extract filename and base without causing undefined errors
      const fname = (sourcePath.split("/").pop() ?? sourcePath) as string;
      const base = (fname.split(".")[0] ?? "") as string;
      iataLookup = base.toUpperCase();
    }

    const airlineEntry = (airlinesInfo as any[]).find(
      (a) => (a.iata || "").toString().toUpperCase() === iataLookup,
    );
    const airlineIconFromInfo = airlineEntry?.icon as string | undefined;

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
        onError={(e: any) => {
          try {
            const img = e?.currentTarget as HTMLImageElement | null;
            if (!img) return;
            img.onerror = null; // prevent loop
            if (airlineIconFromInfo) {
              img.src = airlineIconFromInfo;
            } else {
              img.src = "/assets/logos/default-airline.png";
            }
          } catch (_err) {
            // ignore
          }
        }}
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
                  <FlightActions
                    flight={flight}
                    onEdit={(f: any) => {
                      setEditFlight(f);
                      setEditOpen(true);
                    }}
                  />
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
          <FlightEntryForm
            flight={editFlight}
            onSaved={async () => {
              setEditOpen(false);
              // refresh flights list
              try {
                await fetchFlights();
              } catch (e) {
                // ignore
              }
            }}
          />
        )}
      </Modal>
    </>
  );
};

export default FlightsList;
