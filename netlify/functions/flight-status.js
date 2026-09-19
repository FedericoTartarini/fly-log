const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";

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
