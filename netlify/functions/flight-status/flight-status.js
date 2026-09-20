const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";

const jsonError = (statusCode, error) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ error }),
});

// This function lives in its own directory rather than flat in
// netlify/functions/ so that flight-status.test.js can sit next to it, as
// every other test in this repo does. Netlify only scans the top level of the
// functions directory: a subdirectory is one function whose entry point is
// <dirname>.js, and sibling files are never treated as functions. Flattening
// this back out makes `netlify dev` warn that "flight-status.test" is an
// invalid function name.
//
// Thin proxy: forwards AeroDataBox's response and status code unchanged.
// No caching, no matching logic - that lives client-side in
// src/utils/flightStatusService.ts, which knows the flight's own airports.
export const handler = async (event) => {
  const { flightNumber, date } = event.queryStringParameters || {};

  if (!flightNumber || !date) {
    return jsonError(400, "flightNumber and date are required");
  }

  const apiKey = process.env.RAPIDAPI_AERODATABOX_KEY;
  if (!apiKey) {
    return jsonError(500, "AeroDataBox API key is not configured");
  }

  const url = `https://${AERODATABOX_HOST}/flights/number/${encodeURIComponent(flightNumber)}/${encodeURIComponent(date)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "x-rapidapi-host": AERODATABOX_HOST,
        "x-rapidapi-key": apiKey,
      },
    });
  } catch (err) {
    // Without this, a DNS or connection failure rejects the handler and
    // Netlify answers with an opaque non-JSON 5xx. The client only parses
    // JSON on a 2xx, but the contract is easier to reason about if every
    // response from this function is JSON.
    console.error("AeroDataBox request failed", err);
    return jsonError(502, "Could not reach the flight status provider");
  }

  const body = await response.text();

  return {
    statusCode: response.status,
    // Forward what upstream actually sent rather than asserting JSON over an
    // error page we did not generate.
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
    body,
  };
};
