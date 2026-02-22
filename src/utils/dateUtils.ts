// src/utils/dateUtils.ts
import i18n from "i18next";

type TimestampLike = { toDate: () => Date };
type SecondsLike = { seconds: number };
type DateLike = Date | TimestampLike | SecondsLike | string | number | null | undefined;

/**
 * Format a date-like value into a string. Supports Firestore Timestamp, objects with `seconds`, Date,
 * and parseable date strings. If `format` is provided it supports tokens:
 *  - DD: zero-padded day (01..31)
 *  - D: day (1..31)
 *  - MMM: short month name (Jan..Dec)
 *  - MMMM: full month name (January..December)
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
  value: DateLike,
  format: string = "DD MMM YY",
  locale?: string,
): string {
  if (value === null || value === undefined || value === "") return "";
  try {
    let d: Date | null;
    if (value instanceof Date) {
      d = value;
    } else if (value && typeof value.toDate === "function") {
      // Firestore Timestamp
      d = value.toDate();
    } else if (value && typeof value.seconds === "number") {
      // Firestore-like object with seconds
      d = new Date(value.seconds * 1000);
    } else {
      d = new Date(String(value));
    }

    if (!d || Number.isNaN(d.getTime())) return "";

    // Determine effective locale: explicit param -> i18n.language -> fallback 'en-AU'
    const effectiveLocale = locale || (i18n && i18n.language) || "en-AU";

    // If no format specified, return the locale's default date string
    if (!format) return d.toLocaleDateString(effectiveLocale);

    // Token replacements
    const day = d.getDate();
    const dayP = String(day).padStart(2, "0");
    const year = d.getFullYear();
    const year2 = String(year).slice(-2);
    const monthShort = new Intl.DateTimeFormat(effectiveLocale, {
      month: "short",
    }).format(d);
    const monthLong = new Intl.DateTimeFormat(effectiveLocale, {
      month: "long",
    }).format(d);

    let out = format;
    out = out.replace(/DD/g, dayP);
    out = out.replace(/\bD\b/g, String(day));
    out = out.replace(/MMMM/g, monthLong);
    out = out.replace(/MMM/g, monthShort);
    out = out.replace(/YYYY/g, String(year));
    out = out.replace(/YY/g, year2);

    return out;
  } catch (e) {
    return "";
  }
}

/**
 * Parse a date-like value into a JS Date object, or return null if invalid.
 */
export function parseToDate(value: DateLike): Date | null {
  try {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (value && typeof value.toDate === "function") {
      const d = value.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (value && typeof value.seconds === "number") {
      const d = new Date(value.seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "number") {
      const d = new Date(value >= 1e12 ? value : value * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  } catch (e) {
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
