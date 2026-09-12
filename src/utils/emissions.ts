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
 * Economy is assumed because the flight record carries no cabin class; premium,
 * business and first are multiples of these, so those trips are understated.
 */
export const EMISSION_FACTORS = {
  DOMESTIC: 0.229,
  SHORT_HAUL: 0.126,
  LONG_HAUL: 0.117,
} as const;

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
}): number {
  const distance = flight?.distance_km;
  // typeof narrows away null/undefined; isFinite rejects NaN and Infinity.
  if (typeof distance !== "number" || !Number.isFinite(distance)) return 0;
  if (distance <= 0) return 0;

  // `international` is set from the country pair when a flight is saved; fall
  // back to the countries themselves for records written before that existed.
  const international =
    flight.international ?? flight.departure_country !== flight.arrival_country;

  const factor = !international
    ? EMISSION_FACTORS.DOMESTIC
    : distance < LONG_HAUL_THRESHOLD_KM
      ? EMISSION_FACTORS.SHORT_HAUL
      : EMISSION_FACTORS.LONG_HAUL;

  return distance * factor;
}
