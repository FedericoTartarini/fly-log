import React, { useEffect, useReducer, useState } from "react";
import { Badge, Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../context/AuthContext";
import type { enhancedFlight } from "../types/enhancedFlight";
import { getFlightStatusCooldown } from "../utils/flightStatusCooldown";
import {
  checkFlightStatus,
  FlightStatusError,
} from "../utils/flightStatusService";

interface FlightDetailsPanelProps {
  flight: enhancedFlight;
}

type FlightLegTime = {
  scheduledTime?: { utc?: string };
  revisedTime?: { utc?: string };
  terminal?: string;
  gate?: string;
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

const FlightDetailsPanel: React.FC<FlightDetailsPanelProps> = ({ flight }) => {
  const { t } = useTranslation(["flights"]);
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [, recheckCooldown] = useReducer((n: number) => n + 1, 0);

  const statusData = flight.flight_status as FlightLeg | null | undefined;
  const cooldown = getFlightStatusCooldown(flight);
  const hasFlightNumber = Boolean(flight.flight_number);

  // The cooldown is evaluated against `new Date()` at render time, so without
  // this the button stays disabled after the cooldown expires until something
  // else re-renders the panel. Re-render once, when it actually elapses.
  const nextCheckMs = cooldown.nextCheckAt?.getTime() ?? null;
  useEffect(() => {
    if (nextCheckMs === null) return;
    const delay = nextCheckMs - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(recheckCooldown, delay);
    return () => clearTimeout(timer);
  }, [nextCheckMs]);

  const departureDelay = getDelayMinutes(statusData?.departure);
  const arrivalDelay = getDelayMinutes(statusData?.arrival);

  // 404 and 429 are the two failures a user can act on, so they get their own
  // wording; everything else would only expose an internal English string.
  const errorMessage = (err: unknown): string => {
    if (err instanceof FlightStatusError) {
      if (err.status === 404) return t("status.error_not_found");
      if (err.status === 429) return t("status.error_quota");
      if (err.status === 401) return t("status.error_unauthorized");
    }
    return t("status.error_generic");
  };

  const handleCheck = async () => {
    if (!user?.uid) {
      notifications.show({
        title: t("actions.not_signed_in"),
        message: "",
        color: "red",
      });
      return;
    }
    setIsChecking(true);
    try {
      await checkFlightStatus(user.uid, flight);
      notifications.show({
        title: t("status.check_success_title"),
        message: "",
        color: "green",
      });
    } catch (err) {
      // Keep the technical detail where a developer can find it; the user gets
      // the translated summary.
      console.error("Flight status check failed", err);
      notifications.show({
        title: t("status.check_error_title"),
        message: errorMessage(err),
        color: "red",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const buttonDisabled = !hasFlightNumber || !cooldown.allowed || isChecking;

  return (
    <Stack gap="sm">
      {statusData ? (
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
          {(statusData.departure?.gate || statusData.departure?.terminal) && (
            <Text size="sm">
              {t("status.departure_gate", {
                gate: statusData.departure?.gate ?? "-",
                terminal: statusData.departure?.terminal ?? "-",
              })}
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
      ) : (
        <Text size="sm" c="dimmed">
          {t("status.no_data")}
        </Text>
      )}

      {!hasFlightNumber ? (
        <Text size="sm" c="dimmed">
          {t("status.no_flight_number")}
        </Text>
      ) : (
        <Tooltip
          disabled={cooldown.allowed}
          label={
            cooldown.nextCheckAt
              ? t("status.next_check_at", {
                  value: cooldown.nextCheckAt.toLocaleString(),
                  interpolation: { escapeValue: false },
                })
              : t("status.no_further_checks")
          }
        >
          <span>
            <Button
              onClick={handleCheck}
              loading={isChecking}
              disabled={buttonDisabled}
              style={buttonDisabled ? { pointerEvents: "none" } : undefined}
              data-testid={`flight-status-check-${flight.id}`}
            >
              {t("status.check_button")}
            </Button>
          </span>
        </Tooltip>
      )}
    </Stack>
  );
};

export default FlightDetailsPanel;
