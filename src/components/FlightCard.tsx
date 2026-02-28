// src/components/FlightCard.tsx

import React from "react";
import { Card, Stack, Group, Title, Text, Badge } from "@mantine/core";
import type { enhancedFlight } from "../types/enhancedFlight.ts";
import { formatDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";
import { getAirportCity } from "../utils/airportUtils";

interface FlightCardProps {
  flight: enhancedFlight;
  title: string;
}

/**
 * Displays flight information in a styled card.
 */
const FlightCard: React.FC<FlightCardProps> = ({ flight, title }) => {
  const { t } = useTranslation(["flights"]);

  if (!flight) return null;

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={4}>{title}</Title>
          <Text size="sm">
            <Text span fw={500}>
              {t("airline_label")}
            </Text>{" "}
            {flight.airline_name}
          </Text>
        </Group>

        <Group justify="space-between" grow preventGrowOverflow={false}>
          <Text fw={500} size="lg">
            {getAirportCity(flight.departure_airport_iata) ??
              flight.departure_airport_iata}{" "}
            {t("to", { defaultValue: "→" })}{" "}
            {getAirportCity(flight.arrival_airport_iata) ??
              flight.arrival_airport_iata}
          </Text>
          <Badge variant="light">
            {t("km", {
              value: Math.round(flight.distance_km ?? 0),
            })}
          </Badge>
        </Group>

        <Group justify="space-between">
          <Group gap="xs">
            <Badge size="sm" variant="light" color={"accent"}>
              {flight.departure_country}
            </Badge>
            <Text size="xs" c="dimmed">
              {t("to", { defaultValue: "→" })}
            </Text>
            <Badge size="sm" variant="light" color={"accent"}>
              {flight.arrival_country}
            </Badge>
          </Group>

          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {formatDate(flight.departure_date) || ""}
            </Text>
            <Text size="sm" c="dimmed">
              {typeof flight.flight_time === "number"
                ? (() => {
                    const totalMinutes = Math.round(
                      (flight.flight_time || 0) * 60,
                    );
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return t("flight_time", { hours, minutes });
                  })()
                : ""}
            </Text>
          </Group>
        </Group>

        {flight.aircraft_type_name && (
          <Text size="sm">
            <Text span fw={500}>
              {t("aircraft_label")}
            </Text>{" "}
            {flight.aircraft_type_name}
          </Text>
        )}
      </Stack>
    </Card>
  );
};

export default FlightCard;
