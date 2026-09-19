import { parseToDate, parseHourMinute } from "./dateUtils";
import type { enhancedFlight } from "../types/enhancedFlight";

const HOUR_MS = 60 * 60 * 1000;
const NEAR_DEPARTURE_WINDOW_MS = 2 * HOUR_MS;
const NEAR_DEPARTURE_COOLDOWN_MS = HOUR_MS;
const DEFAULT_COOLDOWN_MS = 24 * HOUR_MS;

// AeroDataBox's full status enum isn't publicly documented; match loosely
// against the terminal-state families rather than an exhaustive list.
const TERMINAL_STATUS_PATTERN = /landed|cancelled|diverted/i;

export interface FlightStatusCooldown {
  allowed: boolean;
  nextCheckAt: Date | null;
}

// ponytail: combines a UTC calendar date with a local wall-clock time as if
// both were UTC - the rest of the app never tracks per-airport timezones for
// departure_time either, so this only ever mis-estimates the 2h-before-departure
// window by the airport's UTC offset, not the stored data. Add real timezone
// lookups if the window needs to be exact.
const getDepartureDateTime = (flight: enhancedFlight): Date | null => {
  const date = parseToDate(flight.departure_date);
  if (!date) return null;
  const time = parseHourMinute(flight.departure_time);
  if (!time) return date;
  const combined = new Date(date);
  combined.setUTCHours(time.hours, time.minutes, 0, 0);
  return combined;
};

const isTerminalStatus = (flight: enhancedFlight): boolean => {
  const status = (
    flight.flight_status as { status?: unknown } | null | undefined
  )?.status;
  return typeof status === "string" && TERMINAL_STATUS_PATTERN.test(status);
};

/**
 * Decides whether the "check status" button should be enabled for a flight.
 * Once a terminal status (landed/cancelled/diverted) has been observed,
 * checking again teaches us nothing new, so it locks out for good.
 * Otherwise the cooldown tightens to hourly within 2 hours of departure,
 * daily otherwise.
 */
export function getFlightStatusCooldown(
  flight: enhancedFlight,
  now: Date = new Date(),
): FlightStatusCooldown {
  const checkedAt = flight.flight_status_checked_at
    ? parseToDate(flight.flight_status_checked_at)
    : null;

  if (!checkedAt) {
    return { allowed: true, nextCheckAt: null };
  }

  if (isTerminalStatus(flight)) {
    return { allowed: false, nextCheckAt: null };
  }

  const departure = getDepartureDateTime(flight);
  const nearDeparture =
    departure !== null &&
    Math.abs(departure.getTime() - now.getTime()) <= NEAR_DEPARTURE_WINDOW_MS;

  const cooldownMs = nearDeparture
    ? NEAR_DEPARTURE_COOLDOWN_MS
    : DEFAULT_COOLDOWN_MS;

  const nextCheckAt = new Date(checkedAt.getTime() + cooldownMs);
  const allowed = now.getTime() >= nextCheckAt.getTime();
  return { allowed, nextCheckAt: allowed ? null : nextCheckAt };
}
