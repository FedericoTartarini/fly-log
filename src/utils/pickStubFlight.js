import { toCalendarDay } from "./dateUtils";

const DAY_MS = 86_400_000;

// Whole calendar days from today to a flight's departure day: 0 today,
// negative in the past. Flight dates name a calendar day, so both sides are
// compared as days rather than instants.
const daysFromToday = (flight, now) => {
  const day = toCalendarDay(flight.departure_date);
  if (!day) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.parse(day) - today) / DAY_MS);
};

/**
 * The flight the stub shows: the next one from today on, or else the most
 * recent one. Returns null when no flight has a usable date.
 */
export const pickStubFlight = (flights, now = new Date()) => {
  let next = null;
  let last = null;
  for (const flight of flights ?? []) {
    const days = daysFromToday(flight, now);
    if (days === null) continue;
    if (days >= 0 && (!next || days < next.days)) next = { flight, days };
    if (days < 0 && (!last || days > last.days)) last = { flight, days };
  }
  return next ?? last;
};
