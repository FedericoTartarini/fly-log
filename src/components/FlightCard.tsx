// src/components/FlightCard.tsx

import React from "react";
import { Card, Stack, Group, Title, Text, Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { enhancedFlight } from "../types/enhancedFlight.ts";

interface FlightCardProps {
  flight: enhancedFlight;
  title: string;
  color: string;
}

/**
 * Displays flight information in a styled card.
 */
const FlightCard: React.FC<FlightCardProps> = ({ flight, title, color }) => {
  const { t } = useTranslation('flights');
  
  if (!flight) return null;

  const hours = Math.floor(flight.flight_time);
  const minutes = Math.round((flight.flight_time % 1) * 60);

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
            {flight.airline_name}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text fw={500} size="lg">
            {flight.departure_airport_iata} → {flight.arrival_airport_iata}
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
              {new Date(flight.departure_date).toLocaleDateString()}
            </Text>
            <Text size="sm" c="dimmed">
              {t('flight_time', { hours, minutes })}
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
