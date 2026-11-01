import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, getActiveFilters } from "./activeFilters";

describe("getActiveFilters", () => {
  it("counts a range as one filter, whichever end is set", () => {
    expect(getActiveFilters(DEFAULT_FILTERS)).toEqual([]);
    expect(
      getActiveFilters({
        ...DEFAULT_FILTERS,
        when: "upcoming",
        toYear: 2026,
        maxDuration: 5,
        arrivalAirport: "SIN",
      }),
    ).toEqual(["when", "years", "arrivalAirport", "duration"]);
  });
});
