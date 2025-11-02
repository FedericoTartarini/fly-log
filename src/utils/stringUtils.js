/**
 * Capitalize the first letter of a string
 */
export function capitalize(value) {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
