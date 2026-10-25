import { describe, it, expect } from "vitest";
import { getCentringRotation } from "./globeRotation";

describe("getCentringRotation", () => {
  it("turns the short way across the antimeridian", () => {
    // China–Sydney centre (~130° E) to Sydney–Los Angeles centre (~170° W).
    expect(getCentringRotation([-130, 20, 0], [-170, -5])).toEqual([
      -190, 5, 0,
    ]);
  });

  it("never turns more than 180° from any start, even after dragging", () => {
    for (const startLon of [-350, -190, -10, 0, 170, 359]) {
      for (const lon of [-180, -170, 0, 130, 180]) {
        const [endLon] = getCentringRotation([startLon, 0, 0], [lon, 0]);
        expect(Math.abs(endLon - startLon)).toBeLessThanOrEqual(180);
        expect((((endLon + lon) % 360) + 360) % 360).toBeCloseTo(0);
      }
    }
  });
});
