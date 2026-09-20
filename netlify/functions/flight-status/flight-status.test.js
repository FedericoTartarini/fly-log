import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handler } from "./flight-status.js";

describe("flight-status function", () => {
  const originalKey = process.env.RAPIDAPI_AERODATABOX_KEY;

  beforeEach(() => {
    process.env.RAPIDAPI_AERODATABOX_KEY = "test-key";
  });

  afterEach(() => {
    process.env.RAPIDAPI_AERODATABOX_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("returns 400 when flightNumber or date is missing", async () => {
    const result = await handler({
      queryStringParameters: { date: "2026-09-20" },
    });
    expect(result.statusCode).toBe(400);
  });

  it("returns 500 when the API key is not configured", async () => {
    delete process.env.RAPIDAPI_AERODATABOX_KEY;
    const result = await handler({
      queryStringParameters: { flightNumber: "QF1", date: "2026-09-20" },
    });
    expect(result.statusCode).toBe(500);
  });

  it("proxies AeroDataBox's response and status code unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve(JSON.stringify([{ status: "Expected" }])),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await handler({
      queryStringParameters: { flightNumber: "QF1", date: "2026-09-20" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://aerodatabox.p.rapidapi.com/flights/number/QF1/2026-09-20",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-rapidapi-key": "test-key",
          "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
        }),
      }),
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([{ status: "Expected" }]);
  });
});
