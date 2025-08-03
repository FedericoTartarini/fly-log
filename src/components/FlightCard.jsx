import React from "react";
import { Card, Stack, Group, Title, Text, Badge } from "@mantine/core";

const FlightCard = ({ flight, title, color }) => {
  if (!flight) return null;

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={4} c={color}>
            {title}
          </Title>

          <Text size="sm">
            <Text span fw={500}>
              Airline:
            </Text>{" "}
            {flight.airline}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text fw={500} size="lg">
            {flight.from} → {flight.to}
          </Text>
          <Badge color={color} variant="light">
            {Math.round(flight.distance_km).toLocaleString()} km
          </Badge>
        </Group>

        <Group justify="space-between">
          <Group gap="xs">
            <Badge size="sm" variant="outline">
              {flight.departure_country}
            </Badge>
            <Text size="xs" c="dimmed">
              to
            </Text>
            <Badge size="sm" variant="outline">
              {flight.arrival_country}
            </Badge>
          </Group>

          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {new Date(flight.date).toLocaleDateString()}
            </Text>
            <Text size="sm" c="dimmed">
              {flight.flight_time.toFixed(2)}h flight time
            </Text>
          </Group>
        </Group>

        {flight.aircraft_type_name && (
          <Text size="sm">
            <Text span fw={500}>
              Aircraft:
            </Text>{" "}
            {flight.aircraft_type_name}
          </Text>
        )}
      </Stack>
    </Card>
  );
};

export default FlightCard;
