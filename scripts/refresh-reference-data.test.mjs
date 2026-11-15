import { describe, expect, it } from "vitest";

import { cleanCity, mergeByIata } from "./refresh-reference-data.mjs";

describe("cleanCity", () => {
  it("uses the served city, not the suburb", () => {
    expect(cleanCity("KUL", "Sepang", "MY")).toBe("Kuala Lumpur");
    expect(cleanCity("SYD", "Sydney (Mascot)", "AU")).toBe("Sydney");
    expect(cleanCity("LBA", "Leeds, West Yorkshire", "GB")).toBe("Leeds");
    expect(cleanCity("XXX", "Shuangta, Chaoyang", "CN")).toBe(
      "Shuangta, Chaoyang",
    );
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
