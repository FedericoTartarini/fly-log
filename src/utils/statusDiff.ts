import { parseToDate, toCalendarDay } from "./dateUtils";

/** Saving checks status automatically only this many days ahead. */
export const AUTO_CHECK_WINDOW_DAYS = 7;

/**
 * Whether a just-saved flight is worth one automatic status check.
 *
 * AeroDataBox only has a reliable schedule close to the flight, so a flight
 * logged months ahead (or years back) would spend quota for nothing. It also
 * needs a flight number to look anything up.
 */
export const isAutoCheckable = (
  flight: { flight_number?: unknown; departure_date?: unknown },
  now: Date = new Date(),
): boolean => {
  if (!flight.flight_number) return false;
  const departure = parseToDate(flight.departure_date);
  if (!departure) return false;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + AUTO_CHECK_WINDOW_DAYS + 1);
  return departure >= start && departure < end;
};

/** The flight fields a status check can correct or fill in. */
export const STATUS_FIELDS = [
  "departure_time",
  "arrival_date",
  "arrival_time",
  "aircraft_type_name",
] as const;

export type StatusField = (typeof STATUS_FIELDS)[number];

export interface StatusChange {
  field: StatusField;
  /** What the user entered, or null when they left it empty. */
  entered: string | null;
  /** What the airline's schedule says. */
  found: string;
}

type LegEnd = { scheduledTime?: { local?: string } };
type StatusLeg = {
  departure?: LegEnd;
  arrival?: LegEnd;
  aircraft?: { model?: string };
};

// AeroDataBox local times look like "2026-07-10 09:00+10:00": the airport's
// own date and wall-clock time, which is what the user enters too.
const localParts = (value: string | undefined) => {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/);
  return match ? { date: match[1]!, time: match[2]! } : null;
};

/**
 * What the airline's schedule says that differs from what the user entered.
 * Only fields the schedule actually has are compared, so an empty answer from
 * AeroDataBox never proposes blanking something the user typed.
 */
export const diffAgainstStatus = (
  flight: Partial<Record<StatusField, unknown>>,
  status: object,
): StatusChange[] => {
  const leg = status as StatusLeg;
  const changes: StatusChange[] = [];
  const compare = (
    field: StatusField,
    entered: string | null,
    found: string | null | undefined,
  ) => {
    if (found && found !== entered) changes.push({ field, entered, found });
  };

  const departure = localParts(leg.departure?.scheduledTime?.local);
  const arrival = localParts(leg.arrival?.scheduledTime?.local);
  const text = (value: unknown) =>
    typeof value === "string" && value ? value : null;

  compare("departure_time", text(flight.departure_time), departure?.time);
  // A same-day arrival is stored as no arrival date, so only a schedule that
  // lands on another day has an arrival date worth proposing.
  if (departure && arrival && arrival.date !== departure.date) {
    compare("arrival_date", toCalendarDay(flight.arrival_date), arrival.date);
  }
  compare("arrival_time", text(flight.arrival_time), arrival?.time);
  compare(
    "aircraft_type_name",
    text(flight.aircraft_type_name),
    leg.aircraft?.model,
  );
  return changes;
};
