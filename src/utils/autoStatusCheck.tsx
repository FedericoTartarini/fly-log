import React from "react";
import i18next from "i18next";
import { notifications } from "@mantine/notifications";
import { checkFlightStatus } from "./flightStatusService";
import { diffAgainstStatus, isAutoCheckable } from "./statusDiff";
import StatusChangesNotice from "../components/StatusChangesNotice";
import type { enhancedFlight } from "../types/enhancedFlight";

type SavedFlight = Partial<enhancedFlight> & { id: string };

/**
 * Check status once for each just-saved flight that departs within the next
 * week, and show what the airline's schedule says differently. Runs after the
 * save has finished and never blocks it: a failed check (no match, quota used
 * up) only means no suggestion appears.
 *
 * The check itself stores the raw status on the flight, as the manual button
 * does. The suggested field changes are only written if the user applies them.
 */
export async function autoCheckSavedFlights(
  uid: string,
  flights: SavedFlight[],
  now: Date = new Date(),
): Promise<void> {
  // One at a time: a CSV import rarely has more than a couple of flights in
  // the window, and sequential calls are gentler on the free-tier quota.
  for (const flight of flights.filter((f) => isAutoCheckable(f, now))) {
    let leg;
    try {
      leg = await checkFlightStatus(uid, flight as enhancedFlight);
    } catch (error) {
      console.info("Automatic status check skipped", flight.id, error);
      continue;
    }

    offerStatusChanges(uid, flight, leg);
  }
}

/**
 * Show what a status check found that differs from what the user entered, with
 * Apply and Keep mine. Used after the automatic check on save and after the
 * manual Check status button. Returns whether there was anything to offer.
 */
export function offerStatusChanges(
  uid: string,
  flight: SavedFlight,
  leg: object,
  automatic = true,
): boolean {
  const changes = diffAgainstStatus(flight, leg);
  if (changes.length === 0) return false;

  const notificationId = `status-changes-${flight.id}`;
  notifications.show({
    id: notificationId,
    autoClose: false,
    title: i18next.t("flights:auto_check.title", {
      flight: `${flight.airline_iata ?? ""}${flight.flight_number ?? ""}`,
      from: flight.departure_airport_iata,
      to: flight.arrival_airport_iata,
    }),
    message: (
      <StatusChangesNotice
        uid={uid}
        flightId={flight.id}
        changes={changes}
        notificationId={notificationId}
        automatic={automatic}
      />
    ),
  });
  return true;
}
