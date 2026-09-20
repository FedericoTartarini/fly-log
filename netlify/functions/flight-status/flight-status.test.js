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
    vi.restoreAllMocks();
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
      headers: new Headers({ "content-type": "application/json" }),
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

  it("answers 502 with a JSON body when AeroDataBox is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND")),
    );

    const result = await handler({
      queryStringParameters: { flightNumber: "QF1", date: "2026-09-20" },
    });

    expect(result.statusCode).toBe(502);
    expect(result.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(result.body).error).toBeTruthy();
  });

  it("never echoes the API key back to the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          Promise.resolve(JSON.stringify({ message: "Not subscribed" })),
      }),
    );

    const result = await handler({
      queryStringParameters: { flightNumber: "QF1", date: "2026-09-20" },
    });

    expect(result.statusCode).toBe(403);
    expect(JSON.stringify(result)).not.toContain("test-key");
  });
});
