import { parseToDate } from "./dateUtils";
import type { enhancedFlight } from "../types/enhancedFlight";

export type Stamp = {
  /** ISO 3166-1 alpha-2 code, upper case. */
  country: string;
  /** The day of the earliest arrival in this country. */
  firstArrival: Date;
  /** How many flights landed in this country. */
  visits: number;
};

/**
 * One passport stamp per country the user has flown into, oldest first, so the
 * passport fills up in the order the user travelled.
 *
 * Every arrival counts, the home country included, because the log has no
 * layover data to tell a connection from a visit. Like the badges, only
 * flights that departed before today count. `now` is injectable for tests.
 */
export const passportStamps = (
  flights: enhancedFlight[] | null | undefined,
  now: Date = new Date(),
): Stamp[] => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const stamps = new Map<string, Stamp>();
  for (const flight of flights ?? []) {
    const departed = parseToDate(flight.departure_date);
    const country = flight.arrival_country?.trim().toUpperCase();
    if (!country || !departed || departed >= startOfToday) continue;
    // An overnight flight lands the next day, so prefer the arrival date.
    const arrived = parseToDate(flight.arrival_date) ?? departed;
    const stamp = stamps.get(country);
    if (!stamp) {
      stamps.set(country, { country, firstArrival: arrived, visits: 1 });
    } else {
      stamp.visits += 1;
      if (arrived < stamp.firstArrival) stamp.firstArrival = arrived;
    }
  }

  return [...stamps.values()].sort(
    (a, b) =>
      a.firstArrival.getTime() - b.firstArrival.getTime() ||
      a.country.localeCompare(b.country),
  );
};

/** The flag emoji for a country code, built from its regional indicator letters. */
export const flagEmoji = (country: string): string =>
  String.fromCodePoint(
    ...[...country.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
