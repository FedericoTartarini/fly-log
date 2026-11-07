import type { enhancedFlight } from "../types/enhancedFlight";
import { toCalendarDay } from "./dateUtils";

export type FlightGroup = {
  /** "upcoming", a year, or null for flights with no readable date. */
  key: "upcoming" | number | null;
  flights: enhancedFlight[];
  km: number;
};

// Today's calendar day where the user is, as "YYYY-MM-DD".
const localDay = (now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/**
 * Sort flights newest first and group them: upcoming flights (today counts)
 * first, then one group per year, then any flight with no readable date.
 * Days are compared as calendar days, so a flight stored as UTC midnight
 * stays on its own day in every time zone. `now` is injectable for tests.
 */
export const groupFlightsByYear = (
  flights: enhancedFlight[],
  now: Date = new Date(),
): FlightGroup[] => {
  const today = localDay(now);
  const dated = flights.map((flight) => ({
    flight,
    day: toCalendarDay(flight.departure_date),
  }));
  // Undated flights sort last; "" sorts below every "YYYY-MM-DD".
  dated.sort((a, b) => (b.day ?? "").localeCompare(a.day ?? ""));

  const groups: FlightGroup[] = [];
  for (const { flight, day } of dated) {
    const key = !day
      ? null
      : day >= today
        ? "upcoming"
        : Number(day.slice(0, 4));
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, flights: [], km: 0 };
      groups.push(group);
    }
    group.flights.push(flight);
    if (Number.isFinite(flight.distance_km)) group.km += flight.distance_km!;
  }
  return groups;
};
