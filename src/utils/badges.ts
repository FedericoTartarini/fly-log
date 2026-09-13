import { parseToDate } from "./dateUtils";
import { EARTH_CIRCUMFERENCE, DISTANCE_TO_MOON } from "../constants/distances";
import type { enhancedFlight } from "../types/enhancedFlight";

/**
 * Lifetime achievements, computed by replaying flights in order rather than by
 * aggregating them. The replay is what makes an unlock date possible: a badge
 * is stamped with the date of the flight that crossed its threshold, so nothing
 * has to be persisted and there is no unlock state to migrate.
 */
export interface Badge {
  id: string;
  unlocked: boolean;
  /** Departure date of the flight that crossed the threshold. */
  unlockedOn?: Date;
  /** Progress towards `target`. Absent for badges that cannot be partly done. */
  current?: number;
  target?: number;
  /** Grouping for the shelf, and what stops the strip showing near-duplicates. */
  category: BadgeCategory;
}

/** Running totals as the flights are replayed, oldest first. */
interface Tally {
  flights: number;
  distance: number;
  countries: Set<string>;
  airports: Set<string>;
  international: number;
  longHaul: number;
  /** Longest run of consecutive calendar months containing a flight. */
  monthStreak: number;
  /** Longest run of consecutive calendar years containing a flight. */
  yearStreak: number;
}

export const BADGE_CATEGORIES = {
  FLIGHTS: "flights",
  DISTANCE: "distance",
  PLACES: "places",
  HABIT: "habit",
} as const;

export type BadgeCategory =
  (typeof BADGE_CATEGORIES)[keyof typeof BADGE_CATEGORIES];

interface BadgeDef {
  id: string;
  category: BadgeCategory;
  target: number;
  value: (tally: Tally) => number;
  /** Binary badges report no progress: a bar pinned at 0% reads as broken. */
  binary?: boolean;
}

const LONG_HAUL_KM = 5000;

// Order here is the catalogue order only. The page sorts for display.
export const BADGE_DEFS: BadgeDef[] = [
  { id: "first_flight", category: BADGE_CATEGORIES.FLIGHTS, target: 1, value: (t) => t.flights, binary: true },
  { id: "border_crossed", category: BADGE_CATEGORIES.PLACES, target: 1, value: (t) => t.international, binary: true },
  { id: "long_hauler", category: BADGE_CATEGORIES.DISTANCE, target: 1, value: (t) => t.longHaul, binary: true },
  { id: "ten_up", category: BADGE_CATEGORIES.FLIGHTS, target: 10, value: (t) => t.flights },
  { id: "half_century", category: BADGE_CATEGORIES.FLIGHTS, target: 50, value: (t) => t.flights },
  { id: "century", category: BADGE_CATEGORIES.FLIGHTS, target: 100, value: (t) => t.flights },
  { id: "two_fifty", category: BADGE_CATEGORIES.FLIGHTS, target: 250, value: (t) => t.flights },
  { id: "five_hundred", category: BADGE_CATEGORIES.FLIGHTS, target: 500, value: (t) => t.flights },
  { id: "once_around", category: BADGE_CATEGORIES.DISTANCE, target: EARTH_CIRCUMFERENCE, value: (t) => t.distance },
  { id: "five_laps", category: BADGE_CATEGORIES.DISTANCE, target: EARTH_CIRCUMFERENCE * 5, value: (t) => t.distance },
  { id: "to_the_moon", category: BADGE_CATEGORIES.DISTANCE, target: DISTANCE_TO_MOON, value: (t) => t.distance },
  {
    id: "there_and_back",
    category: BADGE_CATEGORIES.DISTANCE,
    target: DISTANCE_TO_MOON * 2,
    value: (t) => t.distance,
  },
  { id: "million_club", category: BADGE_CATEGORIES.DISTANCE, target: 1_000_000, value: (t) => t.distance },
  { id: "explorer", category: BADGE_CATEGORIES.PLACES, target: 5, value: (t) => t.countries.size },
  { id: "globetrotter", category: BADGE_CATEGORIES.PLACES, target: 10, value: (t) => t.countries.size },
  { id: "well_travelled", category: BADGE_CATEGORIES.PLACES, target: 25, value: (t) => t.countries.size },
  { id: "country_collector", category: BADGE_CATEGORIES.PLACES, target: 50, value: (t) => t.countries.size },
  { id: "terminal_regular", category: BADGE_CATEGORIES.PLACES, target: 25, value: (t) => t.airports.size },
  { id: "on_a_roll", category: BADGE_CATEGORIES.HABIT, target: 6, value: (t) => t.monthStreak },
  { id: "ten_years_running", category: BADGE_CATEGORIES.HABIT, target: 10, value: (t) => t.yearStreak },
];

/** Badges whose progress is a distance in kilometres, for display formatting. */
export const DISTANCE_BADGES = new Set([
  "once_around",
  "five_laps",
  "to_the_moon",
  "there_and_back",
  "million_club",
]);

/**
 * Longest run of consecutive periods ending at `period`, given every period
 * seen so far. Months are passed as absolute indices (year * 12 + month) so a
 * run across a year boundary — November, December, January — counts as three
 * and not two; years are passed as plain years.
 */
const runEndingAt = (seen: Set<number>, period: number): number => {
  let run = 1;
  while (seen.has(period - run)) run += 1;
  return run;
};

/**
 * Evaluate every badge against a flight history.
 *
 * Only flights that have already departed count: a flight booked for next month
 * unlocks nothing until it has been taken. `now` is injectable so the tests do
 * not depend on the clock.
 */
export const evaluateBadges = (
  flights: enhancedFlight[] | null | undefined,
  now: Date = new Date(),
): Badge[] => {
  // The whole of today counts as upcoming, matching the PAST year filter in
  // store.ts. A date-only departure_date parses to midnight, so comparing
  // against the current time instead would treat a flight departing in a few
  // hours as already taken.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const past = (flights ?? [])
    .map((flight) => ({ flight, date: parseToDate(flight.departure_date) }))
    .filter(
      (entry): entry is { flight: enhancedFlight; date: Date } =>
        entry.date !== null && entry.date.getTime() < startOfToday.getTime(),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const tally: Tally = {
    flights: 0,
    distance: 0,
    countries: new Set(),
    airports: new Set(),
    international: 0,
    longHaul: 0,
    monthStreak: 0,
    yearStreak: 0,
  };

  const monthsSeen = new Set<number>();
  const yearsSeen = new Set<number>();
  const unlockedOn = new Map<string, Date>();

  past.forEach(({ flight, date }) => {
    tally.flights += 1;
    tally.distance += flight.distance_km || 0;

    // Both ends count, matching useFlightStats and the "Airports Visited" stat
    // on the dashboard. The badge must not disagree with the number shown
    // alongside it.
    if (flight.departure_airport_iata)
      tally.airports.add(flight.departure_airport_iata);
    if (flight.arrival_airport_iata)
      tally.airports.add(flight.arrival_airport_iata);
    if (flight.departure_country) tally.countries.add(flight.departure_country);
    if (flight.arrival_country) tally.countries.add(flight.arrival_country);

    if (
      flight.departure_country &&
      flight.arrival_country &&
      flight.departure_country !== flight.arrival_country
    ) {
      tally.international += 1;
    }
    if ((flight.distance_km || 0) >= LONG_HAUL_KM) tally.longHaul += 1;

    // UTC to match getFlightMonthMatrix, so the heatmap and the streak badge
    // agree about which month a flight belongs to.
    const month = date.getUTCFullYear() * 12 + date.getUTCMonth();
    if (!monthsSeen.has(month)) {
      monthsSeen.add(month);
      tally.monthStreak = Math.max(
        tally.monthStreak,
        runEndingAt(monthsSeen, month),
      );
    }

    const year = date.getUTCFullYear();
    if (!yearsSeen.has(year)) {
      yearsSeen.add(year);
      tally.yearStreak = Math.max(
        tally.yearStreak,
        runEndingAt(yearsSeen, year),
      );
    }

    // First flight to push a badge over its target owns the unlock date.
    BADGE_DEFS.forEach((def) => {
      if (!unlockedOn.has(def.id) && def.value(tally) >= def.target) {
        unlockedOn.set(def.id, date);
      }
    });
  });

  return BADGE_DEFS.map((def) => {
    const date = unlockedOn.get(def.id);
    const badge: Badge = {
      id: def.id,
      category: def.category,
      unlocked: date !== undefined,
    };
    if (date) badge.unlockedOn = date;
    if (!def.binary) {
      badge.current = Math.min(def.value(tally), def.target);
      badge.target = def.target;
    }
    return badge;
  });
};

/**
 * Shelf order: what you just earned first, then what you are closest to
 * earning, so "what's next" needs no arithmetic from the reader.
 */
export const sortForShelf = (badges: Badge[]): Badge[] =>
  [...badges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked) {
      return (b.unlockedOn?.getTime() ?? 0) - (a.unlockedOn?.getTime() ?? 0);
    }
    // Binary badges have no ratio; they sit at the end of the locked block.
    const ratio = (badge: Badge) =>
      badge.target ? (badge.current ?? 0) / badge.target : -1;
    return ratio(b) - ratio(a);
  });

/**
 * The badges the stats-page strip shows: the most recent unlocks, then the one
 * closest to being earned.
 *
 * At most one badge per category, so near-duplicates like "To the Moon" and
 * "To the Moon and back" cannot sit side by side saying the same thing twice.
 * Only the categories actually shown are blocked — counting a category while
 * scanning would block one whose badge was then dropped by `limit`.
 */
export const pickStripBadges = (badges: Badge[], limit = 2): Badge[] => {
  const shownCategories = new Set<BadgeCategory>();
  const recent: Badge[] = [];
  for (const badge of badges) {
    if (recent.length >= limit) break;
    if (!badge.unlocked || shownCategories.has(badge.category)) continue;
    shownCategories.add(badge.category);
    recent.push(badge);
  }

  const isCandidate = (badge: Badge) =>
    !badge.unlocked && typeof badge.target === "number";
  // Prefer an unshown category, but never drop the "what's next" line: for
  // someone whose only locked badges share a category with an earned one, a
  // repeated category beats showing nothing to aim at.
  const next =
    badges.find((b) => isCandidate(b) && !shownCategories.has(b.category)) ??
    badges.find(isCandidate);

  return next ? [...recent, next] : recent;
};
