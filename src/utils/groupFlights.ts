import type { enhancedFlight } from "../types/enhancedFlight";
import { toCalendarDay } from "./dateUtils";

export type FlightSort = "newest" | "oldest" | "longest" | "shortest";

export type FlightGroup = {
  /**
   * "upcoming", a year, or null for flights with no readable date. A
   * distance sort has one group keyed by the sort itself.
   */
  key: "upcoming" | number | null | "longest" | "shortest";
  flights: enhancedFlight[];
  km: number;
};

// Today's calendar day where the user is, as "YYYY-MM-DD".
const localDay = (now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const kmOf = (flight: enhancedFlight): number | null =>
  Number.isFinite(flight.distance_km) ? flight.distance_km : null;

/**
 * Sort flights and group them for the Flights list.
 *
 * Newest: upcoming flights (today counts, soonest first) at the top, then
 * one group per year, newest first. Oldest: the same groups the other way
 * round, so upcoming flights come last. Either way, flights with no readable
 * date come last. Longest and Shortest: one group, flights with no distance
 * last, and equal distances newest first.
 *
 * Days are compared as calendar days, so a flight stored as UTC midnight
 * stays on its own day in every time zone. `now` is injectable for tests.
 */
export const groupFlights = (
  flights: enhancedFlight[],
  sort: FlightSort = "newest",
  now: Date = new Date(),
): FlightGroup[] => {
  if (!flights.length) return [];
  const today = localDay(now);
  let dated = flights.map((flight) => ({
    flight,
    day: toCalendarDay(flight.departure_date),
  }));
  // Undated flights sort last; "" sorts below every "YYYY-MM-DD".
  dated.sort((a, b) => (b.day ?? "").localeCompare(a.day ?? ""));

  if (sort === "longest" || sort === "shortest") {
    const sign = sort === "longest" ? -1 : 1;
    // Array sort is stable, so equal distances stay newest first.
    const byKm = dated
      .map(({ flight }) => flight)
      .sort((a, b) => {
        const x = kmOf(a);
        const y = kmOf(b);
        if (x === null || y === null)
          return (x === null ? 1 : 0) - (y === null ? 1 : 0);
        return sign * (x - y);
      });
    return [
      {
        key: sort,
        flights: byKm,
        km: byKm.reduce((sum, f) => sum + (kmOf(f) ?? 0), 0),
      },
    ];
  }

  if (sort === "oldest") {
    dated = [
      ...dated.filter(({ day }) => day).reverse(),
      ...dated.filter(({ day }) => !day),
    ];
  }

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
    group.km += kmOf(flight) ?? 0;
  }
  // The next flight to take reads first, so upcoming flights run soonest
  // first. Oldest already has them that way round.
  if (sort === "newest" && groups[0]?.key === "upcoming") {
    groups[0].flights.reverse();
  }
  return groups;
};
