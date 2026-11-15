import { describe, it, expect } from "vitest";
import { passportStamps, flagEmoji } from "./passport";
import type { enhancedFlight } from "../types/enhancedFlight";

const NOW = new Date("2026-06-01T00:00:00Z");

// Only the fields the stamps read.
const flight = (
  departure_date: string,
  arrival_country: string | null,
  overrides: Partial<enhancedFlight> = {},
): enhancedFlight =>
  ({
    id: `${departure_date}-${arrival_country}`,
    departure_date,
    departure_country: "AU",
    arrival_country,
    ...overrides,
  }) as enhancedFlight;

const day = (date: Date) => date.toISOString().slice(0, 10);

describe("passportStamps", () => {
  it("gives one stamp per arrival country with its first arrival and visit count", () => {
    const stamps = passportStamps(
      [
        flight("2024-03-01", "IT"),
        flight("2020-07-15", "IT"),
        flight("2022-01-10", "AU"),
        flight("2023-05-05", "it"),
      ],
      NOW,
    );
    expect(
      stamps.map((s) => [s.country, day(s.firstArrival), s.visits]),
    ).toEqual([
      ["IT", "2020-07-15", 3],
      ["AU", "2022-01-10", 1],
    ]);
  });

  it("dates the stamp by the arrival day of an overnight flight", () => {
    const [stamp] = passportStamps(
      [flight("2021-12-31", "SG", { arrival_date: "2022-01-01" })],
      NOW,
    );
    expect(day(stamp.firstArrival)).toBe("2022-01-01");
  });

  it("sorts countries first stamped on the same day by code", () => {
    const stamps = passportStamps(
      [flight("2022-01-10", "SG"), flight("2022-01-10", "GB")],
      NOW,
    );
    expect(stamps.map((s) => s.country)).toEqual(["GB", "SG"]);
  });

  it("skips upcoming flights and flights with no arrival country", () => {
    expect(
      passportStamps(
        [flight("2026-06-01", "JP"), flight("2025-01-01", null)],
        NOW,
      ),
    ).toEqual([]);
    expect(passportStamps(null, NOW)).toEqual([]);
  });
});

describe("flagEmoji", () => {
  it("turns a country code into its flag", () => {
    expect(flagEmoji("it")).toBe("🇮🇹");
  });
});
