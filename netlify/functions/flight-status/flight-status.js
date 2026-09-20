const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";

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
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "flightNumber and date are required" }),
    };
  }

  const apiKey = process.env.RAPIDAPI_AERODATABOX_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "AeroDataBox API key is not configured" }),
    };
  }

  const url = `https://${AERODATABOX_HOST}/flights/number/${encodeURIComponent(flightNumber)}/${encodeURIComponent(date)}`;

  const response = await fetch(url, {
    headers: {
      "x-rapidapi-host": AERODATABOX_HOST,
      "x-rapidapi-key": apiKey,
    },
  });

  const body = await response.text();

  return {
    statusCode: response.status,
    headers: { "content-type": "application/json" },
    body,
  };
};
