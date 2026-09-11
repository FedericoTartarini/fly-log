import { describe, it, expect } from "vitest";
import {
  estimateCo2Kg,
  EMISSION_FACTORS,
  LONG_HAUL_THRESHOLD_KM,
} from "./emissions";
import type { enhancedFlight } from "../types/enhancedFlight";

const flight = (overrides: Partial<enhancedFlight>) =>
  ({
    departure_country: "AU",
    arrival_country: "AU",
    international: false,
    distance_km: 1000,
    ...overrides,
  }) as enhancedFlight;

describe("estimateCo2Kg", () => {
  it("picks the domestic factor when both ends are the same country", () => {
    expect(estimateCo2Kg(flight({ distance_km: 1000 }))).toBeCloseTo(
      1000 * EMISSION_FACTORS.DOMESTIC,
    );
  });

  it("splits international flights at the long-haul threshold", () => {
    const short = flight({
      international: true,
      arrival_country: "NZ",
      distance_km: LONG_HAUL_THRESHOLD_KM - 1,
    });
    const long = flight({
      international: true,
      arrival_country: "GB",
      distance_km: LONG_HAUL_THRESHOLD_KM,
    });

    expect(estimateCo2Kg(short)).toBeCloseTo(
      (LONG_HAUL_THRESHOLD_KM - 1) * EMISSION_FACTORS.SHORT_HAUL,
    );
    expect(estimateCo2Kg(long)).toBeCloseTo(
      LONG_HAUL_THRESHOLD_KM * EMISSION_FACTORS.LONG_HAUL,
    );
  });

  it("emits more per kilometre on a short haul than a long one", () => {
    // Take-off and climb dominate a short flight, so the intensity is higher.
    // If this ever flips, the factors have been transcribed wrongly.
    expect(EMISSION_FACTORS.SHORT_HAUL).toBeGreaterThan(
      EMISSION_FACTORS.LONG_HAUL,
    );
  });

  it("falls back to the country pair when `international` is absent", () => {
    const noFlag = {
      departure_country: "AU",
      arrival_country: "JP",
      distance_km: 7800,
    } as enhancedFlight;
    expect(estimateCo2Kg(noFlag)).toBeCloseTo(
      7800 * EMISSION_FACTORS.LONG_HAUL,
    );
  });

  it("returns zero rather than NaN when the distance is unknown", () => {
    expect(estimateCo2Kg(flight({ distance_km: null }))).toBe(0);
    expect(estimateCo2Kg({} as enhancedFlight)).toBe(0);
  });
});
