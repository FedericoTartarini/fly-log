// src/components/FlightList.jsx
import React from "react";
import { Image, Table, Text, ActionIcon, Center } from "@mantine/core";
import flightsData from "../../python/flights_with_coordinates.json";
import useFlightStore from "../store";
import { getFilteredFlights } from "../utils/flightUtils.js";
import { IconPlaneInflight } from "@tabler/icons-react";

const FlightList = () => {
  /** @type {import('../types').Flight[]} */
  const allFlights = flightsData;
  const { selectedYear } = useFlightStore();
  const filteredFlights = getFilteredFlights(allFlights, selectedYear);

  if (filteredFlights.length === 0) {
    return (
      <Text mt="md" ta="center">
        No flights to display for this selection.
      </Text>
    );
  }

  const getAirlineIcon = (flight) => {
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

    const imageUrl = new URL(
      `../assets/airlines_logos/${sourcePath}`,
      import.meta.url,
    ).href;

    return <Image src={imageUrl} alt={`${flight.airline} icon`} height={10} />;
  };

  const rows = filteredFlights.map((flight, index) => (
    <Table.Tr key={index}>
      <Table.Td>
        <Center>{getAirlineIcon(flight)}</Center>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {flight.from} → {flight.to}
        </Text>
        <Text size="xs" c="dimmed">
          {flight.airline_name || flight.airline}: {flight.flight_number}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{new Date(flight.date).toLocaleDateString()}</Text>
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
