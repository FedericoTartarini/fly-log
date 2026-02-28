import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

const loadFreshModule = async () => {
  vi.resetModules();
  return await import("./referenceData");
};

describe("referenceData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty maps before loading", async () => {
    const { getReferenceMapsSync } = await loadFreshModule();
    const maps = getReferenceMapsSync();
    expect(maps.airportByIata.size).toBe(0);
    expect(maps.airlineByIata.size).toBe(0);
  });

  it("loadAirportsInfo caches results and avoids duplicate fetches", async () => {
    const { loadAirportsInfo } = await loadFreshModule();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          iata: "JFK",
          airport_name: "JFK",
          city: "New York",
          country: "United States",
          lat: 40.6413,
          lon: -73.7781,
          iso_country: "US",
          iso_region: "US-NY",
          elevation: 13,
        },
      ],
    });

    const first = await loadAirportsInfo();
    const second = await loadAirportsInfo();

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("loadReferenceMaps builds lookup maps for airports and airlines", async () => {
    const { loadReferenceMaps } = await loadFreshModule();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          iata: "JFK",
          airport_name: "JFK",
          city: "New York",
          country: "United States",
          lat: 40.6413,
          lon: -73.7781,
          iso_country: "US",
          iso_region: "US-NY",
          elevation: 13,
        },
      ],
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ iata: "AA", name: "American", icao: "AAL" }],
    });

    const maps = await loadReferenceMaps();

    expect(maps.airportByIata.get("JFK")?.city).toBe("New York");
    expect(maps.airlineByIata.get("AA")?.icao).toBe("AAL");
  });

  it("loadAirlinesInfo throws on invalid data", async () => {
    const { loadAirlinesInfo } = await loadFreshModule();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ invalid: true }),
    });

    await expect(loadAirlinesInfo()).rejects.toThrow(/Invalid airlines data/i);
  });
});
