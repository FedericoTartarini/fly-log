import { describe, expect, it } from "vitest";

import { cityFor, mergeByIata } from "./refresh-reference-data.mjs";

const place = (name, population = 0, metro = false) => ({
  name,
  population,
  metro,
});

describe("cityFor", () => {
  it("uses a manual entry first", () => {
    expect(cityFor("SZB", "Subang", "MY", [place("Subang Jaya")])).toBe(
      "Kuala Lumpur",
    );
  });

  it("keeps the OurAirports municipality when Wikidata lists it too", () => {
    expect(
      cityFor("ARN", "Stockholm", "SE", [
        place("Stockholm", 984748),
        place("Uppsala", 1),
      ]),
    ).toBe("Stockholm");
  });

  it("uses Wikidata's only settlement", () => {
    expect(cityFor("KUL", "Sepang", "MY", [place("Kuala Lumpur")])).toBe(
      "Kuala Lumpur",
    );
  });

  it("uses the most populous settlement, skipping metro areas", () => {
    expect(
      cityFor("LEJ", "Schkeuditz", "DE", [
        place("Halle (Saale)", 226186),
        place("Leipzig", 615932),
      ]),
    ).toBe("Leipzig");
    expect(
      cityFor("IAD", "Dulles", "US", [
        place("Washington metropolitan area", 6385162, true),
        place("Washington, D.C.", 689545),
      ]),
    ).toBe("Washington, D.C.");
  });

  it("falls back to the cleaned OurAirports municipality", () => {
    expect(cityFor("SYD", "Sydney (Mascot)", "AU")).toBe("Sydney");
    expect(cityFor("LBA", "Leeds, West Yorkshire", "GB")).toBe("Leeds");
    expect(cityFor("ONT", "Ontario, California", "US")).toBe(
      "Ontario, California",
    );
    expect(cityFor("XXX", "Lae", "PG", [place("")])).toBe("Lae");
  });
});

describe("mergeByIata", () => {
  it("adds, updates, keeps missing codes and never blanks a field", () => {
    const old = [
      { iata: "AA", name: "Old", icao: "AAL" },
      { iata: "ZZ", name: "Gone", icao: "ZZZ" },
    ];
    const fresh = [
      { iata: "AA", name: "New", icao: null },
      { iata: "BB", name: "Added", icao: "BBB" },
    ];
    const { list, stats } = mergeByIata(old, fresh);
    expect(list).toEqual([
      { iata: "AA", name: "New", icao: "AAL" },
      { iata: "BB", name: "Added", icao: "BBB" },
      { iata: "ZZ", name: "Gone", icao: "ZZZ" },
    ]);
    expect(stats).toEqual({ added: 1, changed: 1, unchanged: 0, kept: 1 });
  });
});
