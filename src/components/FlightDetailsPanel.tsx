import React from "react";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { enhancedFlight } from "../types/enhancedFlight";

interface FlightDetailsPanelProps {
  flight: enhancedFlight;
}

type FlightLegTime = {
  scheduledTime?: { utc?: string };
  revisedTime?: { utc?: string };
  terminal?: string;
  gate?: string;
  checkInDesk?: string;
  airport?: { name?: string; municipalityName?: string };
};
type FlightLeg = {
  status?: string;
  departure?: FlightLegTime;
  arrival?: FlightLegTime;
  aircraft?: { model?: string; reg?: string };
};

const parseUtc = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
};

// AeroDataBox doesn't return a delay field directly - it's the gap between
// the original schedule and the revised one.
const getDelayMinutes = (leg: FlightLegTime | undefined): number | null => {
  const scheduled = parseUtc(leg?.scheduledTime?.utc);
  const revised = parseUtc(leg?.revisedTime?.utc);
  if (!scheduled || !revised) return null;
  const diff = Math.round((revised.getTime() - scheduled.getTime()) / 60000);
  return diff === 0 ? null : diff;
};

const formatAirport = (leg: FlightLegTime | undefined): string | null => {
  const name = leg?.airport?.name;
  const city = leg?.airport?.municipalityName;
  if (name && city) return `${name}, ${city}`;
  return name ?? city ?? null;
};

const FlightDetailsPanel: React.FC<FlightDetailsPanelProps> = ({
  flight,
}) => {
  const { t } = useTranslation(["flights"]);
  const statusData = flight.flight_status as FlightLeg | null | undefined;

  if (!statusData) {
    return (
      <Text size="sm" c="dimmed">
        {t("status.no_data")}
      </Text>
    );
  }

  const departureDelay = getDelayMinutes(statusData.departure);
  const arrivalDelay = getDelayMinutes(statusData.arrival);
  const departureAirport = formatAirport(statusData.departure);
  const arrivalAirport = formatAirport(statusData.arrival);

  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text fw={500}>{t("status.status_label")}</Text>
        <Badge variant="light">
          {statusData.status ?? t("status.unknown")}
        </Badge>
      </Group>
      {departureDelay !== null && (
        <Text size="sm">
          {t("status.departure_delay", { value: departureDelay })}
        </Text>
      )}
      {arrivalDelay !== null && (
        <Text size="sm">
          {t("status.arrival_delay", { value: arrivalDelay })}
        </Text>
      )}
      {departureAirport && (
        <Text size="sm">
          {t("status.departure_airport", { value: departureAirport })}
        </Text>
      )}
      {(statusData.departure?.gate || statusData.departure?.terminal) && (
        <Text size="sm">
          {t("status.departure_gate", {
            gate: statusData.departure?.gate ?? "-",
            terminal: statusData.departure?.terminal ?? "-",
          })}
        </Text>
      )}
      {statusData.departure?.checkInDesk && (
        <Text size="sm">
          {t("status.check_in_desk", {
            value: statusData.departure.checkInDesk,
          })}
        </Text>
      )}
      {arrivalAirport && (
        <Text size="sm">
          {t("status.arrival_airport", { value: arrivalAirport })}
        </Text>
      )}
      {(statusData.arrival?.gate || statusData.arrival?.terminal) && (
        <Text size="sm">
          {t("status.arrival_gate", {
            gate: statusData.arrival?.gate ?? "-",
            terminal: statusData.arrival?.terminal ?? "-",
          })}
        </Text>
      )}
      {(statusData.aircraft?.model || statusData.aircraft?.reg) && (
        <Text size="sm">
          {t("status.aircraft", {
            model: statusData.aircraft?.model ?? "-",
            reg: statusData.aircraft?.reg ?? "-",
          })}
        </Text>
      )}
      {flight.flight_status_checked_at && (
        <Text size="xs" c="dimmed">
          {t("status.checked_at", {
            value: new Date(
              flight.flight_status_checked_at,
            ).toLocaleString(),
            interpolation: { escapeValue: false },
          })}
        </Text>
      )}
    </Stack>
  );
};

export default FlightDetailsPanel;
