// src/utils/dateUtils.ts
import i18n from "i18next";

type TimestampLike = { toDate: () => Date };
type SecondsLike = { seconds: number };
export type DateLike =
  | Date
  | TimestampLike
  | SecondsLike
  | string
  | number
  | null
  | undefined;

const isTimestampLike = (value: unknown): value is TimestampLike => {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { toDate?: unknown }).toDate === "function";
};

const isSecondsLike = (value: unknown): value is SecondsLike => {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { seconds?: unknown }).seconds === "number";
};

/**
 * Format a date-like value into a string. Supports Firestore Timestamp, objects with `seconds`, Date,
 * and parseable date strings. If `format` is provided it supports tokens:
 *  - DD: zero-padded day (01..31)
 *  - D: day (1..31)
 *  - MMM: short month name (Jan.Dec)
 *  - MMMM: full month name (January.December)
 *  - YY: two-digit year
 *  - YYYY: four-digit year
 *
 * Example: formatDate(value, "DD MMM YY", "en-AU") -> "10 Nov 24"
 *
 * @param value date-like value
 * @param format format string using tokens (DD, D, MMM, MMMM, YY, YYYY). If omitted, returns locale date string.
 * @param locale optional BCP-47 locale string (default: 'en-AU')
 */
export function formatDate(
  value: unknown,
  format: string = "DD MMM YY",
  locale?: string,
): string {
  if (value === null || value === undefined || value === "") return "";
  try {
    const d = parseToDate(value);
    if (!d) return "";

    // Determine effective locale: explicit param -> i18n.language -> fallback 'en-AU'
    const effectiveLocale = locale || (i18n && i18n.language) || "en-AU";

    // If no format specified, return the locale's default date string. Read in
    // UTC for the same reason formatCalendarDate is: everything this app
    // formats is a calendar date, not a genuine instant.
    if (!format) return d.toLocaleDateString(effectiveLocale, { timeZone: "UTC" });

    return formatCalendarDate(d, format, effectiveLocale);
  } catch {
    return "";
  }
}

/**
 * Format a date-like value as the calendar date it names, not as an instant.
 *
 * Kept as a named alias for callers (badges, flight dates) that want to be
 * explicit they're formatting a calendar date. `formatDate` itself is UTC-based
 * for the same reason: nothing in this app formats a genuine instant.
 */
export function formatCalendarDate(
  value: unknown,
  format: string = "DD MMM YY",
  locale?: string,
): string {
  const d = parseToDate(value);
  if (!d) return "";

  const effectiveLocale = locale || (i18n && i18n.language) || "en-AU";
  const monthShort = new Intl.DateTimeFormat(effectiveLocale, {
    month: "short",
    timeZone: "UTC",
  }).format(d);
  const monthLong = new Intl.DateTimeFormat(effectiveLocale, {
    month: "long",
    timeZone: "UTC",
  }).format(d);
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();

  return format
    .replace(/DD/g, String(day).padStart(2, "0"))
    .replace(/\bD\b/g, String(day))
    .replace(/MMMM/g, monthLong)
    .replace(/MMM/g, monthShort)
    .replace(/YYYY/g, String(year))
    .replace(/YY/g, String(year).slice(-2));
}

/**
 * Parse a date-like value into a JS Date object, or return null if invalid.
 */
// Convert date-like inputs into a JS Date (or null on invalid input).
export function parseToDate(value: unknown): Date | null {
  try {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (isTimestampLike(value)) {
      const d = value.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (isSecondsLike(value)) {
      const d = new Date(value.seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "number") {
      const d = new Date(value >= 1e12 ? value : value * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Return the full year (e.g., 2024) for a date-like value, or null if unparsable
 */
export function getYear(value: DateLike): number | null {
  const d = parseToDate(value);
  return d ? d.getFullYear() : null;
}

/**
 * Parse an "HH:MM" time string into hour/minute numbers, validating ranges.
 * @returns an object with hours and minutes when valid (00:00-23:59), otherwise null.
 */
export function parseHourMinute(
  time: unknown,
): { hours: number; minutes: number } | null {
  if (typeof time !== "string") return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Normalize an "HH:MM" time string to zero-padded "HH:MM", or null if invalid.
 */
export function normalizeTimeString(time: unknown): string | null {
  const parsed = parseHourMinute(time);
  if (!parsed) return null;
  return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
}
