import { describe, it, expect } from "vitest";
import { AIRCRAFT_NAMES, aircraftFamily, findAircraftName } from "./aircraft";

describe("aircraftFamily", () => {
  it("groups variants, with or without the variant reported", () => {
    expect(aircraftFamily("Airbus A330")).toBe("Airbus A330");
    expect(aircraftFamily("Airbus A330-300")).toBe("Airbus A330");
    expect(aircraftFamily("Boeing 737 MAX 8")).toBe("Boeing 737 MAX");
    expect(aircraftFamily("Embraer E190")).toBe("Embraer E190");
  });

  it("keeps re-engined generations apart, however they are spelled", () => {
    expect(aircraftFamily("Airbus A320 NEO")).toBe("Airbus A320neo");
    expect(aircraftFamily("Airbus A330-900")).toBe("Airbus A330neo");
    expect(aircraftFamily("Boeing 737-800")).toBe("Boeing 737");
  });

  it("doesn't cut names whose dash isn't the variant", () => {
    expect(aircraftFamily("De Havilland Canada DHC-8-400")).toBe(
      "De Havilland Canada Dash 8",
    );
  });

  it("falls back to the dash rule for names not on the list", () => {
    expect(aircraftFamily("Comac C919-100")).toBe("Comac C919");
    expect(aircraftFamily(null)).toBeNull();
  });
});

describe("findAircraftName", () => {
  it("returns the listed spelling, or null", () => {
    expect(findAircraftName("boeing 787-9")).toBe("Boeing 787-9");
    expect(findAircraftName("A380")).toBeNull();
  });

  it("lists every name once", () => {
    expect(new Set(AIRCRAFT_NAMES).size).toBe(AIRCRAFT_NAMES.length);
  });
});
