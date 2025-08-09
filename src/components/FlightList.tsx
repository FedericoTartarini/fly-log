import React from "react";
import { Image, Table, Text, ActionIcon, Center } from "@mantine/core";
import useFlightStore from "../store";
import { IconPlaneInflight } from "@tabler/icons-react";
import type { enhancedFlight } from "../types/enhancedFlight.ts";
import type { JSX } from "react";

/**
 * Renders a list of flights in a table.
 * @returns {JSX.Element}
 */
const FlightList: React.FC = () => {
  const { filteredFlights } = useFlightStore() as {
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
  const getAirlineIcon = (flight: enhancedFlight): JSX.Element => {
    const sourcePath = flight.airline_icon_path;

    if (!sourcePath) {
      return (
        <ActionIcon aria-label="Settings" color="gray">
          <IconPlaneInflight
            style={{ width: "70%", height: "70%" }}
            stroke={1.5}
          />
        </ActionIcon>
      );
    }

    let imageUrl: string;
    imageUrl = new URL(
      `../assets/airlines_logos/${sourcePath}`,
      import.meta.url,
    ).href;

    return (
      <Image
        src={imageUrl}
        alt={`${flight.airline_name ?? ""} icon`}
        height={10}
      />
    );
  };

  const rows = filteredFlights.map((flight, index) => (
    <Table.Tr key={index}>
      <Table.Td>
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
        <Text size="sm">
          {new Date(flight.departure_date).toLocaleDateString()}
        </Text>
        <Text size="xs" c="dimmed">
          {`${Math.floor(flight.flight_time)}h ${Math.round(
            (flight.flight_time % 1) * 60,
          )}m, ${Math.round(flight.distance_km).toLocaleString()} km`}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

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

export default FlightList;
