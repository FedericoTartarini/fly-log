import React, { useEffect, useReducer, useState } from "react";
import {
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../context/AuthContext";
import type { enhancedFlight } from "../types/enhancedFlight";
import FlightCard from "./FlightCard";
import FlightDetailsPanel from "./FlightDetailsPanel";
import { deleteFlightForUser } from "../utils/flightService";
import { getFlightStatusCooldown } from "../utils/flightStatusCooldown";
import {
  checkFlightStatus,
  FlightStatusError,
} from "../utils/flightStatusService";

interface FlightDetailsModalProps {
  flight: enhancedFlight;
  onEdit: (flight: enhancedFlight) => void;
}

const FlightDetailsModal: React.FC<FlightDetailsModalProps> = ({
  flight,
  onEdit,
}) => {
  const { t } = useTranslation(["flights"]);
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [, recheckCooldown] = useReducer((n: number) => n + 1, 0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const cooldown = getFlightStatusCooldown(flight);
  const hasFlightNumber = Boolean(flight.flight_number);

  // The cooldown is evaluated against `new Date()` at render time, so without
  // this the button stays disabled after the cooldown expires until something
  // else re-renders the modal. Re-render once, when it actually elapses.
  const nextCheckMs = cooldown.nextCheckAt?.getTime() ?? null;
  useEffect(() => {
    if (nextCheckMs === null) return;
    const delay = nextCheckMs - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(recheckCooldown, delay);
    return () => clearTimeout(timer);
  }, [nextCheckMs]);

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
      // Keep the technical detail where a developer can find it; the user
      // gets the translated summary.
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

  const handleDelete = async () => {
    if (!user?.uid) {
      notifications.show({
        title: t("actions.not_signed_in"),
        message: "",
        color: "red",
      });
      return;
    }
    setIsDeleting(true);
    try {
      // The Firestore listener removes the flight (and FlightsList closes
      // this modal once the flight disappears from the list) as soon as the
      // local write lands.
      await deleteFlightForUser(user.uid, flight.id);
      notifications.show({
        title: t("actions.deleted_title"),
        message: t("actions.deleted_message"),
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: t("actions.delete_error_title"),
        message: err instanceof Error ? err.message : String(err),
        color: "red",
      });
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  const checkButtonDisabled = !cooldown.allowed || isChecking;
  const flightNumberLabel = flight.flight_number
    ? `${flight.airline_iata ?? ""}${flight.flight_number}`
    : (flight.airline_name ?? "");

  return (
    <Stack gap="md">
      <FlightCard flight={flight} title={flightNumberLabel} />

      <Divider />

      <FlightDetailsPanel flight={flight} />

      <Divider />

      <Group justify="flex-end">
        <Button
          variant="default"
          leftSection={<IconPencil size={14} />}
          onClick={() => onEdit(flight)}
          data-testid={`flight-details-edit-${flight.id}`}
        >
          {t("actions.edit")}
        </Button>

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
                disabled={checkButtonDisabled}
                style={
                  checkButtonDisabled ? { pointerEvents: "none" } : undefined
                }
                data-testid={`flight-status-check-${flight.id}`}
              >
                {t("status.check_button")}
              </Button>
            </span>
          </Tooltip>
        )}

        <Button
          color="red"
          variant="light"
          leftSection={<IconTrash size={14} />}
          onClick={() => setConfirmOpen(true)}
          data-testid={`flight-details-delete-${flight.id}`}
        >
          {t("actions.delete")}
        </Button>
      </Group>

      <Modal
        opened={confirmOpen}
        onClose={() => !isDeleting && setConfirmOpen(false)}
        closeOnClickOutside={!isDeleting}
        closeOnEscape={!isDeleting}
        withCloseButton={!isDeleting}
        title={t("actions.confirm_delete_title")}
        centered
      >
        <Text>{t("actions.confirm_delete_message")}</Text>
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => !isDeleting && setConfirmOpen(false)}
            disabled={isDeleting}
            data-testid={`flight-delete-cancel-${flight.id}`}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            loading={isDeleting}
            data-testid={`flight-delete-confirm-${flight.id}`}
          >
            {t("actions.delete")}
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
};

export default FlightDetailsModal;
