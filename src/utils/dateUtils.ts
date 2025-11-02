import i18n from '../i18n';

/**
 * Parse various date formats to a JavaScript Date object
 * Handles Date objects, Firestore Timestamps, objects with seconds, and strings
 */
export function parseToDate(value: any): Date | null {
  if (!value) return null;

  // Already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Firestore Timestamp (has toDate method)
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }

  // Object with seconds (Firestore-like)
  if (typeof value === 'object' && value.seconds) {
    return new Date(value.seconds * 1000);
  }

  // String
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Get year from a date value
 */
export function getYear(value: any): number | null {
  const date = parseToDate(value);
  return date ? date.getFullYear() : null;
}

/**
 * Format a date with optional format string and locale
 * @param value - Date value (Date, Timestamp, string, etc.)
 * @param format - Optional format string with tokens (DD, D, MMM, MMMM, YY, YYYY)
 * @param locale - Optional locale (defaults to i18n.language or 'en-AU')
 * @returns Formatted date string
 */
export function formatDate(
  value: any,
  format?: string,
  locale?: string
): string {
  const date = parseToDate(value);
  if (!date) return '';

  const currentLocale = locale || i18n.language || 'en-AU';

  // If no format specified, return locale default date
  if (!format) {
    return date.toLocaleDateString(currentLocale);
  }

  // Replace format tokens
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  const monthNames = {
    long: date.toLocaleDateString(currentLocale, { month: 'long' }),
    short: date.toLocaleDateString(currentLocale, { month: 'short' }),
  };

  let formatted = format;
  formatted = formatted.replace('DD', day.toString().padStart(2, '0'));
  formatted = formatted.replace('D', day.toString());
  formatted = formatted.replace('MMMM', monthNames.long);
  formatted = formatted.replace('MMM', monthNames.short);
  formatted = formatted.replace('YYYY', year.toString());
  formatted = formatted.replace('YY', year.toString().slice(-2));

  return formatted;
}
