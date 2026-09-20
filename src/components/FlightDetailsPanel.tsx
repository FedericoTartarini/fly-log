import React from "react";
import { Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { enhancedFlight } from "../types/enhancedFlight";

interface FlightDetailsPanelProps {
  flight: enhancedFlight;
}

type FlightLegTime = {
  scheduledTime?: { utc?: string; local?: string };
  revisedTime?: { utc?: string; local?: string };
  terminal?: string;
  gate?: string;
  checkInDesk?: string;
  airport?: { name?: string; shortName?: string };
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
// the original schedule and the revised one. An exact match returns 0 (not
// null) so "on time" renders as its own badge rather than silently showing
// nothing; null means the comparison isn't possible (one side missing).
const getDelayMinutes = (leg: FlightLegTime | undefined): number | null => {
  const scheduled = parseUtc(leg?.scheduledTime?.utc);
  const revised = parseUtc(leg?.revisedTime?.utc);
  if (!scheduled || !revised) return null;
  return Math.round((revised.getTime() - scheduled.getTime()) / 60000);
};

// AeroDataBox's local time strings already carry the airport's own UTC
// offset (e.g. "2026-07-01 11:51+01:00") - pulling the HH:mm out directly
// avoids re-interpreting it in the browser's timezone.
const extractLocalTime = (value: string | undefined): string | null => {
  if (!value) return null;
  const match = value.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/);
  return match?.[1] ?? null;
};

// Airport name only, not the city: the flight's own logged route (shown in
// FlightCard above) already names the city, in our own airports reference.
// AeroDataBox's city name sometimes disagrees with ours (e.g. Kuala Lumpur
// airport: "Sepang" in our data, "Kuala Lumpur" in theirs) - repeating a
// second, possibly-different city name here would confuse more than help.
const formatAirport = (leg: FlightLegTime | undefined): string | null =>
  leg?.airport?.shortName ?? leg?.airport?.name ?? null;

type DelayTier = "green" | "yellow" | "red";
const getDelayColor = (delay: number): DelayTier => {
  if (delay <= 0) return "green";
  if (delay < 15) return "yellow";
  return "red";
};

const LegBlock: React.FC<{
  heading: string;
  leg: FlightLegTime | undefined;
  checkInDeskLabel?: (value: string) => string;
}> = ({ heading, leg, checkInDeskLabel }) => {
  const { t } = useTranslation(["flights"]);
  const airport = formatAirport(leg);
  const scheduled = extractLocalTime(leg?.scheduledTime?.local);
  const revised = extractLocalTime(leg?.revisedTime?.local);
  const delay = getDelayMinutes(leg);
  const primaryTime = revised ?? scheduled;
  // Only worth a separate line when the two actually differ - a 0-minute
  // delay means they're the same instant, just spelled out twice.
  const showScheduledSeparately =
    delay !== null && delay !== 0 && scheduled && scheduled !== revised;
  const hasGateInfo = Boolean(leg?.gate || leg?.terminal);

  if (!airport && !primaryTime && !hasGateInfo && !leg?.checkInDesk) {
    return null;
  }

  return (
    <Stack gap={4}>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        {heading}
      </Text>
      {airport && <Text size="sm">{airport}</Text>}
      {showScheduledSeparately && (
        <Text size="xs" c="dimmed">
          {t("status.scheduled_time", { value: scheduled })}
        </Text>
      )}
      {(primaryTime || delay !== null) && (
        <Group gap="xs">
          {primaryTime && (
            <Text size="sm" fw={500}>
              {primaryTime}
            </Text>
          )}
          {delay !== null && (
            <Badge color={getDelayColor(delay)} variant="light" size="sm">
              {delay === 0
                ? t("status.on_time")
                : delay > 0
                  ? t("status.delay_late", { value: delay })
                  : t("status.delay_early", { value: Math.abs(delay) })}
            </Badge>
          )}
        </Group>
      )}
      {hasGateInfo && (
        <Text size="sm" c="dimmed">
          {t("status.gate_terminal", {
            gate: leg?.gate ?? "-",
            terminal: leg?.terminal ?? "-",
          })}
        </Text>
      )}
      {leg?.checkInDesk && checkInDeskLabel && (
        <Text size="sm" c="dimmed">
          {checkInDeskLabel(leg.checkInDesk)}
        </Text>
      )}
    </Stack>
  );
};

const FlightDetailsPanel: React.FC<FlightDetailsPanelProps> = ({
  flight,
}) => {
  const { t } = useTranslation(["flights"]);
  const statusData = flight.flight_status as FlightLeg | null | undefined;

  if (!statusData) {
    return (
      <Card shadow="sm" radius="md" withBorder>
        <Text size="sm" c="dimmed">
          {t("status.no_data")}
        </Text>
      </Card>
    );
  }

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <Text fw={500}>{t("status.status_label")}</Text>
          <Badge variant="light">
            {statusData.status ?? t("status.unknown")}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <LegBlock
            heading={t("status.departure_heading")}
            leg={statusData.departure}
            checkInDeskLabel={(value) =>
              t("status.check_in_desk", { value })
            }
          />
          <LegBlock
            heading={t("status.arrival_heading")}
            leg={statusData.arrival}
          />
        </SimpleGrid>

        {(statusData.aircraft?.model || statusData.aircraft?.reg) && (
          <Text size="sm">
            {t("status.aircraft", {
              model: statusData.aircraft?.model ?? "-",
              reg: statusData.aircraft?.reg ?? "-",
            })}
          </Text>
        )}

        {flight.flight_status_checked_at && (
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              {t("status.checked_at", {
                value: new Date(
                  flight.flight_status_checked_at,
                ).toLocaleString(),
                interpolation: { escapeValue: false },
              })}
            </Text>
            <Text size="xs" c="dimmed">
              {t("status.source")}
            </Text>
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

export default FlightDetailsPanel;
