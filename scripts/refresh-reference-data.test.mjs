import { describe, expect, it } from "vitest";

import {
  checkIcao,
  cityFor,
  mergeByIata,
  sameName,
} from "./refresh-reference-data.mjs";

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

describe("sameName", () => {
  it("ignores accents, case, spacing and generic words", () => {
    expect(sameName("VietjetAir", "VietJet Air")).toBe(true);
    expect(sameName("Royal Brunei", "Royal Brunei Airlines")).toBe(true);
    expect(sameName("Aerolineas Argentinas", "Aerolíneas Argentinas")).toBe(
      true,
    );
  });

  it("reads both names of a 'dba' airline", () => {
    expect(
      sameName("8165343 Canada Inc. dba Air Canada rouge", "Air Canada Rouge"),
    ).toBe(true);
  });

  it("keeps a subsidiary apart from its parent", () => {
    expect(sameName("Lufthansa", "Lufthansa Cargo")).toBe(false);
  });
});

// Shaped like the items airlineItems returns. Q-numbers above 1000 are the
// real Wikidata items, as they were on 2026-11-17. Q1 to Q3 are made up.
const item = (id, icao, names, dissolved = false) => ({
  id,
  icao,
  names,
  dissolved,
});

describe("checkIcao", () => {
  it("confirms a code that a same-name item has", () => {
    expect(
      checkIcao({ name: "Qantas", icao: "QFA" }, [
        item("Q32491", ["QFA"], ["Qantas"]),
        item("Q869352", ["QFA"], ["Qantas Freight"]),
      ]),
    ).toEqual({ icao: "QFA", verdict: "confirmed", items: ["Q32491"] });
  });

  it("corrects a subsidiary's code to the airline's own", () => {
    expect(
      checkIcao({ name: "Lufthansa", icao: "GEC" }, [
        item("Q9325", ["DLH"], ["Lufthansa"]),
        item("Q265138", ["GEC"], ["Lufthansa Cargo"]),
      ]),
    ).toEqual({ icao: "DLH", verdict: "corrected", items: ["Q9325"] });
  });

  it("prefers the item still flying over a dissolved one", () => {
    expect(
      checkIcao({ name: "Gulf Air", icao: "GBA" }, [
        item("Q473231", ["GFA"], ["Gulf Air"]),
        item("Q1", ["GFX"], ["Gulf Air"], true),
      ]).icao,
    ).toBe("GFA");
  });

  it("confirms on a partly matching name only when the codes agree", () => {
    expect(
      checkIcao(
        { name: "Air Wisconsin Airlines Corporation(AWAC)", icao: "AWI" },
        [item("Q2", ["AWI"], ["Air Wisconsin Holdings"])],
      ).verdict,
    ).toBe("confirmed");
  });

  it("removes a code that belongs to an older airline with the IATA code", () => {
    expect(
      checkIcao({ name: "Bonza", icao: "BER" }, [
        item("Q3", ["BER"], ["Air Berlin"], true),
      ]),
    ).toEqual({ icao: null, verdict: "removed", items: [] });
  });

  it("leaves the code empty when same-name items disagree", () => {
    expect(
      checkIcao({ name: "Avion Express", icao: null }, [
        item("Q791093", ["NVD"], ["Avion Express"]),
        item("Q124727484", ["AEB"], ["Avion Express"]),
      ]).verdict,
    ).toBe("none");
  });
});
