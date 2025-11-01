// src/utils/dateUtils.ts

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
 * @param value any date-like value
 * @param format optional format string using tokens (DD, D, MMM, MMMM, YY, YYYY). If omitted, returns locale date string.
 * @param locale optional BCP-47 locale string (default: 'en-AU')
 */
export function formatDate(
  value: any,
  format?: string = "DD MMM YY",
  locale = "en-AU",
): string {
  if (value === null || value === undefined || value === "") return "";
  try {
    let d: Date | null = null;
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

    if (!format) return d.toLocaleDateString(locale);

    // Token replacements
    const day = d.getDate();
    const dayP = String(day).padStart(2, "0");
    const year = d.getFullYear();
    const year2 = String(year).slice(-2);
    const monthShort = new Intl.DateTimeFormat(locale, {
      month: "short",
    }).format(d);
    const monthLong = new Intl.DateTimeFormat(locale, { month: "long" }).format(
      d,
    );

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
