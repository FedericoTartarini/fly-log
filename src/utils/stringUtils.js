// Utility string helpers
/**
 * Capitalize the first letter of a string and leave the rest as-is.
 * If the input is falsy, returns an empty string.
 * It also trims surrounding whitespace.
 */
export function capitalize(value) {
  if (!value && value !== "") return "";
  const s = String(value).trim();
  if (s.length === 0) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
