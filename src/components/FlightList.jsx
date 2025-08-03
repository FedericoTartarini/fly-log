// src/components/FlightList.jsx
import React from "react";
import { Image, Table, Text } from "@mantine/core";
import flightsData from "../../python/flights_with_coordinates.json";
import useFlightStore from "../store";
import { getFilteredFlights } from "../utils/flightUtils.js";
import PlaneIcon from "../assets/airlines_logos/plane.svg";

const FlightList = () => {
  /** @type {import('../types').Flight[]} */
  const allFlights = flightsData;
  const { selectedYear } = useFlightStore();
  const filteredFlights = getFilteredFlights(allFlights, selectedYear);

  if (filteredFlights.length === 0) {
    return (
      <Text mt="md" ta="center">
        No filteredFlights to display for this selection.
      </Text>
    );
  }

  const getAirlineIcon = (flight) => {
    const source = flight.airline_icon_path || PlaneIcon;

    return (
      <Image
        src={source}
        alt={`${flight.Airline} icon`}
        width={24}
        height={24}
        style={{ marginRight: 8 }}
      />
    );
  };

  const rows = filteredFlights.map((flight, index) => (
    <Table.Tr key={index}>
      <Table.Td>{getAirlineIcon(flight)}</Table.Td>
      <Table.Td>
        <Text size="sm">
          {flight.From} → {flight.To}
        </Text>
        <Text size="xs" c="dimmed">
          {flight.Airline}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{new Date(flight.Date).toLocaleDateString()}</Text>
        <Text size="xs" c="dimmed">
          {`${Math.floor(flight.flight_time)}h ${Math.round(
            (flight.flight_time % 1) * 60,
          )}m, ${Math.round(flight.distance_km).toLocaleString()} km`}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table mt="lg" striped highlightOnHover withTableBorder>
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
