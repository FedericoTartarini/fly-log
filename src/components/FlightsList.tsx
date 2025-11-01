import React from "react";
import { Image, Table, Text, ActionIcon, Center } from "@mantine/core";
import useFlightStore from "../store";
import { IconPlaneInflight } from "@tabler/icons-react";
import type { enhancedFlight } from "../types/enhancedFlight.ts";
import { formatDate } from "../utils/dateUtils";

/**
 * Renders a list of flights in a table.
 * @returns {JSX.Element}
 */
const FlightsList: React.FC = () => {
  // The store's Flight type differs from enhancedFlight; cast via unknown to satisfy TypeScript
  const { filteredFlights } = useFlightStore() as unknown as {
    filteredFlights: enhancedFlight[];
  };

  if (filteredFlights.length === 0) {
    return (
      <Text mt="md" ta="center">
        No flights to display for this selection.
      </Text>
    );
  }

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

    let imageUrl: string;
    try {
      // new URL with import.meta may cause TypeScript to complain in some build configs; ignore the TS check here
      // @ts-ignore
      imageUrl = new URL(`../assets/logos/${sourcePath}`, import.meta.url).href;
    } catch (e) {
      // Fallback to a public path (if assets are copied to /assets at build)
      imageUrl = `/assets/logos/${sourcePath}`;
    }

    return (
      <Image
        src={imageUrl}
        alt={`${flight.airline_name ?? ""} icon`}
        h={50}
        w="auto"
        fit="contain"
        loading="lazy"
        p={4}
      />
    );
  };

  const rows = filteredFlights.map((flight, index) => {
    // Use en-US numeric date format (MM/DD/YYYY) to match existing tests & user expectation
    const departureDateStr = formatDate(
      flight.departure_date,
      undefined,
      "en-US",
    );

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
      <Table.Tr key={index}>
        <Table.Td p={"0"}>
          <Center>{getAirlineIcon(flight)}</Center>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {flight.departure_airport_iata} → {flight.arrival_airport_iata}
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
      </Table.Tr>
    );
  });

  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Icon</Table.Th>
          <Table.Th>From → To</Table.Th>
          <Table.Th>Date, Duration & Distance</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};

export default FlightsList;
