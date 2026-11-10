import React, { useEffect, useReducer, useRef, useState } from "react";
import { Avatar, Button } from "@mantine/core";
import {
  IconArrowNarrowRight,
  IconPencil,
  IconPlaneInflight,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../context/AuthContext";
import type { enhancedFlight } from "../types/enhancedFlight";
import FlightDetailsPanel from "./FlightDetailsPanel";
import { deleteFlightForUser } from "../utils/flightService";
import { getFlightStatusCooldown } from "../utils/flightStatusCooldown";
import {
  checkFlightStatus,
  FlightStatusError,
} from "../utils/flightStatusService";
import { offerStatusChanges } from "../utils/autoStatusCheck";
import { getAirportCity } from "../utils/airportUtils";
import {
  arrivalDayOffset,
  formatCalendarDate,
  normalizeTimeString,
} from "../utils/dateUtils";
import classes from "./FlightDetails.module.css";

interface FlightDetailsModalProps {
  flight: enhancedFlight;
  onEdit: (flight: enhancedFlight) => void;
}

const flightNumberOf = (flight: enhancedFlight): string | null =>
  flight.flight_number
    ? `${flight.airline_iata ?? ""}${flight.flight_number}`
    : null;

/**
 * The flight as a boarding pass: airline band, the two airports with their
 * times, and a stub with date, distance, cabin and aircraft.
 */
const DetailsPass: React.FC<{ flight: enhancedFlight }> = ({ flight }) => {
  const { t, i18n } = useTranslation(["flights"]);
  const from = flight.departure_airport_iata;
  const to = flight.arrival_airport_iata;
  const offset = arrivalDayOffset(flight.departure_date, flight.arrival_date);
  const arrival = normalizeTimeString(flight.arrival_time);
  const minutes =
    typeof flight.flight_time === "number"
      ? Math.round(flight.flight_time * 60)
      : null;
  const fields = [
    [
      t("pass.date"),
      formatCalendarDate(flight.departure_date, "D MMM YYYY", i18n.language),
    ],
    [
      t("details.distance"),
      typeof flight.distance_km === "number"
        ? t("km", {
            value: Math.round(flight.distance_km).toLocaleString(i18n.language),
          })
        : null,
    ],
    // No cabin saved means economy, the same rule the emissions use.
    [t("details.cabin"), t(`cabin.${flight.cabin_class ?? "economy"}`)],
    [t("details.aircraft"), flight.aircraft_type_name],
  ];

  return (
    <article aria-label={t("details.pass_label")} className={classes.pass}>
      <div className={classes.band}>
        <span className={classes.airline}>
          <Avatar
            src={
              flight.airline_icon_path
                ? `/logos/${flight.airline_icon_path}`
                : undefined
            }
            alt=""
            radius="xl"
            size={28}
            aria-hidden
          >
            {flight.airline_iata || <IconPlaneInflight size={16} />}
          </Avatar>
          {flight.airline_name}
        </span>
        <span className={classes.mono}>{flightNumberOf(flight)}</span>
      </div>
      <div className={classes.route}>
        <div>
          <p className={classes.code}>{from}</p>
          <p className={classes.city}>{getAirportCity(from) ?? from}</p>
          <p className={classes.time}>
            {normalizeTimeString(flight.departure_time)}
          </p>
        </div>
        <div className={classes.duration}>
          <IconArrowNarrowRight
            size={36}
            color="var(--fl-accent)"
            role="img"
            aria-label={t("to")}
          />
          {minutes !== null &&
            t("details.duration", {
              hours: Math.floor(minutes / 60),
              minutes: minutes % 60,
            })}
        </div>
        <div className={classes.end}>
          <p className={classes.code}>{to}</p>
          <p className={classes.city}>{getAirportCity(to) ?? to}</p>
          <p className={classes.time}>
            {arrival}
            {arrival && offset !== 0 && (
              <sup>{`${offset > 0 ? "+" : "−"}${Math.abs(offset)}`}</sup>
            )}
          </p>
        </div>
      </div>
      <dl className={classes.stub}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className={classes.label}>{label}</dt>
            <dd>{value || "–"}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
};

const FlightDetailsModal: React.FC<FlightDetailsModalProps> = ({
  flight,
  onEdit,
}) => {
  const { t } = useTranslation(["flights"]);
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [, recheckCooldown] = useReducer((n: number) => n + 1, 0);
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  const cooldown = getFlightStatusCooldown(flight);
  const flightNumber = flightNumberOf(flight);

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

  // The confirmation replaces the buttons, so focus moves into it and back to
  // Delete when the user keeps the flight.
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
    else if (wasConfirming.current) deleteRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

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
      const leg = await checkFlightStatus(user.uid, flight);
      // Differences from what the user entered replace the plain success
      // message, so they can update the flight in one click.
      if (!offerStatusChanges(user.uid, flight, leg, false)) {
        notifications.show({
          title: t("status.check_success_title"),
          message: "",
          color: "green",
        });
      }
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
      console.error("Deleting flight failed", err);
      notifications.show({
        title: t("actions.delete_error_title"),
        message: t("actions.delete_error_message"),
        color: "red",
      });
    } finally {
      setIsDeleting(false);
      setConfirming(false);
    }
  };

  const route = t("list.cities", {
    from:
      getAirportCity(flight.departure_airport_iata) ??
      flight.departure_airport_iata,
    to:
      getAirportCity(flight.arrival_airport_iata) ??
      flight.arrival_airport_iata,
  });
  const checkHint = cooldown.allowed
    ? t("status.check_hint")
    : cooldown.nextCheckAt
      ? t("status.next_check_at", {
          value: cooldown.nextCheckAt.toLocaleString(),
          interpolation: { escapeValue: false },
        })
      : t("status.no_further_checks");

  return (
    <div className={classes.details}>
      <DetailsPass flight={flight} />

      <FlightDetailsPanel flight={flight} />

      {confirming ? (
        <div
          role="alertdialog"
          aria-labelledby="flight-delete-question"
          aria-describedby="flight-delete-warning"
          className={classes.confirm}
        >
          <p id="flight-delete-question" className={classes.question}>
            {flightNumber
              ? t("actions.delete_question", {
                  flight: flightNumber,
                  route,
                  interpolation: { escapeValue: false },
                })
              : t("actions.delete_question_no_number", {
                  route,
                  interpolation: { escapeValue: false },
                })}
          </p>
          <p id="flight-delete-warning" className={classes.muted}>
            {t("actions.delete_warning")}
          </p>
          <div className={classes.pair}>
            <Button
              ref={keepRef}
              variant="default"
              size="md"
              onClick={() => setConfirming(false)}
              disabled={isDeleting}
              data-testid={`flight-delete-cancel-${flight.id}`}
            >
              {t("actions.keep")}
            </Button>
            <Button
              size="md"
              onClick={handleDelete}
              loading={isDeleting}
              data-testid={`flight-delete-confirm-${flight.id}`}
            >
              {t("actions.delete_flight")}
            </Button>
          </div>
        </div>
      ) : (
        <div className={classes.actions}>
          <div className={classes.pair}>
            <Button
              variant="default"
              size="md"
              leftSection={<IconPencil size={18} aria-hidden />}
              onClick={() => onEdit(flight)}
              data-testid={`flight-details-edit-${flight.id}`}
            >
              {t("actions.edit")}
            </Button>
            {flightNumber && (
              <Button
                size="md"
                color="var(--fl-ink)"
                c={cooldown.allowed ? "var(--fl-surface)" : "var(--fl-muted)"}
                leftSection={<IconRefresh size={18} aria-hidden />}
                onClick={handleCheck}
                loading={isChecking}
                disabled={!cooldown.allowed || isChecking}
                aria-describedby="flight-check-hint"
                data-testid={`flight-status-check-${flight.id}`}
              >
                {t("status.check_button")}
              </Button>
            )}
          </div>
          {flightNumber && (
            <p id="flight-check-hint" className={classes.hint}>
              {checkHint}
            </p>
          )}
          <Button
            ref={deleteRef}
            variant="subtle"
            size="md"
            c="var(--fl-accent-text)"
            leftSection={<IconTrash size={18} aria-hidden />}
            onClick={() => setConfirming(true)}
            className={classes.delete}
            data-testid={`flight-details-delete-${flight.id}`}
          >
            {t("actions.delete_flight")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default FlightDetailsModal;
