// src/components/FlightCard.tsx

import React from "react";
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { enhancedFlight } from "../types/enhancedFlight.ts";
import { formatCalendarDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";
import { getAirportCity } from "../utils/airportUtils";

interface FlightCardProps {
  flight: enhancedFlight;
  /** Used by the statistics page; the details modal identifies the flight in its title. */
  title?: string;
  showAirline?: boolean;
}

/**
 * Displays flight information in a styled card.
 */
const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  title,
  showAirline = true,
}) => {
  const { t } = useTranslation(["flights"]);

  if (!flight) return null;

  const departureCity =
    getAirportCity(flight.departure_airport_iata) ??
    flight.departure_airport_iata;
  const arrivalCity =
    getAirportCity(flight.arrival_airport_iata) ?? flight.arrival_airport_iata;
  const dateTime = `${formatCalendarDate(flight.departure_date) || ""}${
    flight.departure_time ? ` · ${flight.departure_time}` : ""
  }`;
  const duration =
    typeof flight.flight_time === "number"
      ? (() => {
          const totalMinutes = Math.round(flight.flight_time * 60);
          return t("flight_time", {
            hours: Math.floor(totalMinutes / 60),
            minutes: totalMinutes % 60,
          });
        })()
      : null;

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack gap="xs">
        {(title || (showAirline && flight.airline_name)) && (
          <Group justify="space-between">
            {title && <Title order={4}>{title}</Title>}
            {showAirline && flight.airline_name && (
              <Text size="sm" c="dimmed">
                {flight.airline_name}
              </Text>
            )}
          </Group>
        )}

        <Text fw={600} size="lg">
          {departureCity}{" "}
          <Text span c="dimmed">
            ({flight.departure_airport_iata})
          </Text>{" "}
          {t("to", { defaultValue: "→" })} {arrivalCity}{" "}
          <Text span c="dimmed">
            ({flight.arrival_airport_iata})
          </Text>
        </Text>

        {(flight.departure_country || flight.arrival_country) && (
          <Group gap="xs">
            <Badge size="sm" variant="light" color="accent">
              {flight.departure_country ?? "–"}
            </Badge>
            <Text size="xs" c="dimmed">
              {t("to", { defaultValue: "→" })}
            </Text>
            <Badge size="sm" variant="light" color="accent">
              {flight.arrival_country ?? "–"}
            </Badge>
          </Group>
        )}

        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs">
          {dateTime && <Text size="sm">{dateTime}</Text>}
          {duration && <Text size="sm">{duration}</Text>}
          {typeof flight.distance_km === "number" && (
            <Text size="sm">
              {t("km", { value: Math.round(flight.distance_km) })}
            </Text>
          )}
        </SimpleGrid>

        {flight.aircraft_type_name && (
          <Text size="sm">
            {t("aircraft_label")} {flight.aircraft_type_name}
          </Text>
        )}
      </Stack>
    </Card>
  );
};

export default FlightCard;
