import { describe, it, expect } from "vitest";
import airports from "../assets/airports.json";
import { getContinent } from "./continents";

describe("getContinent", () => {
  it("maps every country that has an airport in the reference data", () => {
    const unmapped = [
      ...new Set(airports.map((airport) => airport.iso_country)),
    ].filter((code) => getContinent(code) === null);
    expect(unmapped).toEqual([]);
  });

  it("settles the borderline countries the GeoNames way", () => {
    expect(getContinent("RU")).toBe("EU");
    expect(getContinent("TR")).toBe("AS");
    expect(getContinent("EG")).toBe("AF");
    expect(getContinent("PA")).toBe("NA");
  });

  it("ignores case and whitespace, and returns null for unknown codes", () => {
    expect(getContinent(" au ")).toBe("OC");
    expect(getContinent("ZZ")).toBeNull();
    expect(getContinent(null)).toBeNull();
  });
});
