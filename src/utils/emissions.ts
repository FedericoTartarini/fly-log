/**
 * Where the emission factors below come from. Surfaced in the UI so the
 * estimate can be traced back to a published source.
 */
export const EMISSION_FACTOR_SOURCE = {
  name: "UK Government greenhouse gas conversion factors 2025 (DESNZ/DEFRA)",
  url: "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
  year: 2025,
} as const;

/**
 * Whether the factors include the radiative forcing uplift, which accounts for
 * the non-CO2 warming effects of aviation at altitude - contrails, NOx and
 * water vapour. It adds roughly 70%. DEFRA and the GHG Protocol recommend
 * reporting with it, so it is included here.
 *
 * This is a methodological choice, not a detail: switching it off would cut
 * every figure in the app by about 40%. To do that, swap the factors below for
 * DEFRA's "without RF" column and flip this flag - both belong together.
 */
export const INCLUDES_RADIATIVE_FORCING = true;

/**
 * kg CO2e per passenger-kilometre, economy class, with radiative forcing.
 * Economy is what a flight with no cabin class recorded is assumed to be.
 */
export const EMISSION_FACTORS = {
  DOMESTIC: 0.229,
  SHORT_HAUL: 0.126,
  LONG_HAUL: 0.117,
} as const;

export const CABIN_CLASSES = {
  ECONOMY: "economy",
  PREMIUM_ECONOMY: "premium_economy",
  BUSINESS: "business",
  FIRST: "first",
} as const;

export type CabinClass = (typeof CABIN_CLASSES)[keyof typeof CABIN_CLASSES];

/**
 * Per-cabin factors, from the same DEFRA 2025 "with RF" table, "to/from UK"
 * rows, rounded to three places like the economy factors above.
 *
 * DEFRA does not publish every cabin for every haul, so the gaps are filled
 * from the nearest published one rather than invented:
 * - domestic has only an average-passenger factor, so every cabin uses it;
 * - short haul has only economy and business, so premium economy takes the
 *   economy factor and first takes the business one.
 */
const CABIN_FACTORS: Record<
  keyof typeof EMISSION_FACTORS,
  Record<CabinClass, number>
> = {
  DOMESTIC: {
    economy: EMISSION_FACTORS.DOMESTIC,
    premium_economy: EMISSION_FACTORS.DOMESTIC,
    business: EMISSION_FACTORS.DOMESTIC,
    first: EMISSION_FACTORS.DOMESTIC,
  },
  SHORT_HAUL: {
    economy: EMISSION_FACTORS.SHORT_HAUL,
    premium_economy: EMISSION_FACTORS.SHORT_HAUL,
    business: 0.189,
    first: 0.189,
  },
  LONG_HAUL: {
    economy: EMISSION_FACTORS.LONG_HAUL,
    premium_economy: 0.187,
    business: 0.339,
    first: 0.468,
  },
};

const isCabinClass = (value: unknown): value is CabinClass =>
  Object.values(CABIN_CLASSES).includes(value as CabinClass);

/** DEFRA splits international flights into short and long haul at 3700 km. */
export const LONG_HAUL_THRESHOLD_KM = 3700;

/**
 * Estimate a single flight's emissions in kg CO2e.
 *
 * Uses the flight's great-circle distance as flown. Real routes are longer
 * because of air-traffic routing, holding and stacking - ICAO applies a
 * correction for this, which is deliberately not applied here rather than
 * guessed at. The estimate is therefore slightly conservative.
 *
 * @returns kg CO2e, or 0 when the distance is unknown or not a finite number.
 */
export function estimateCo2Kg(flight: {
  distance_km?: number | null;
  international?: boolean;
  departure_country?: string | null;
  arrival_country?: string | null;
  /** Stored as entered, so anything unrecognised is treated as economy. */
  cabin_class?: unknown;
}): number {
  const distance = flight?.distance_km;
  // typeof narrows away null/undefined; isFinite rejects NaN and Infinity.
  if (typeof distance !== "number" || !Number.isFinite(distance)) return 0;
  if (distance <= 0) return 0;

  // `international` is set from the country pair when a flight is saved; fall
  // back to the countries themselves for records written before that existed.
  const international =
    flight.international ?? flight.departure_country !== flight.arrival_country;

  const haul = !international
    ? "DOMESTIC"
    : distance < LONG_HAUL_THRESHOLD_KM
      ? "SHORT_HAUL"
      : "LONG_HAUL";
  // Absent or unrecognised means economy, exactly as before cabins existed.
  const cabin = isCabinClass(flight.cabin_class)
    ? flight.cabin_class
    : CABIN_CLASSES.ECONOMY;
  const factor = CABIN_FACTORS[haul][cabin];

  return distance * factor;
}
