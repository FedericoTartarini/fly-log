type RunwayLeg = { runwayTime?: { utc?: string } | undefined } | undefined;

/** AeroDataBox's UTC strings, such as "2026-09-20 06:08Z", as a Date. */
export const parseUtc = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Minutes between takeoff and touchdown, from the UTC runway times so the two
 * airports' time zones cancel out. Null when either time is missing or the
 * pair makes no sense.
 */
export const getAirMinutes = (
  departure: RunwayLeg,
  arrival: RunwayLeg,
): number | null => {
  const up = parseUtc(departure?.runwayTime?.utc);
  const down = parseUtc(arrival?.runwayTime?.utc);
  if (!up || !down) return null;
  const minutes = Math.round((down.getTime() - up.getTime()) / 60000);
  return minutes > 0 ? minutes : null;
};
