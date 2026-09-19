# Flight Status Checker (AeroDataBox) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user manually check live status (delay, gate, terminal, aircraft) for a logged flight, on demand, via a serverless proxy to AeroDataBox.

**Architecture:** A Netlify function (`netlify/functions/flight-status.js`) holds the RapidAPI key server-side and proxies AeroDataBox's flight-by-number-and-date endpoint unchanged. The client (`src/utils/flightStatusService.ts`) calls that function, picks the one leg matching the flight's actual departure/arrival airports (the endpoint can return several legs for a flight number around a date boundary), and writes it onto the flight's Firestore document. A pure cooldown function decides when the "check status" button is enabled. A new `FlightDetailsPanel` renders the stored data and the button, opened from a `Modal` triggered from `FlightActions`.

**Tech Stack:** React 19 + TypeScript/JSX (mixed, matching existing files), Mantine UI, Firebase Firestore, Netlify Functions, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-flight-status-enrichment-design.md`

## Global Constraints

- The RapidAPI key lives in `RAPIDAPI_AERODATABOX_KEY` (Netlify env + local `.env.local`), **never** prefixed `VITE_` — that would ship it to the client bundle.
- `netlify/functions/flight-status.js` is a thin proxy: no caching, no matching/business logic, passes AeroDataBox's response and status code straight through.
- Cooldown is enforced client-side only, via one pure function (`getFlightStatusCooldown`) — no server-side rate limiting.
- No automatic/scheduled fetching. No batch backfill. No new stats charts. (All confirmed out of scope during brainstorming.)
- Store AeroDataBox's response as-is (`flight_status: Record<string, unknown> | null`) rather than one field per data point.
- AeroDataBox's `status` enum isn't publicly documented in full; terminal states (landed/cancelled/diverted) are matched by substring, case-insensitively, against the confirmed real value `"Landed"` plus the documented `"Cancelled"`/`"Diverted"` families — don't hard-code an exhaustive enum.

---

### Task 1: Flight type + status cooldown helper

**Files:**
- Modify: `src/types/enhancedFlight.ts`
- Create: `src/utils/flightStatusCooldown.ts`
- Test: `src/utils/flightStatusCooldown.test.ts`

**Interfaces:**
- Produces: `enhancedFlight.flight_status: Record<string, unknown> | null` (optional), `enhancedFlight.flight_status_checked_at: string | null` (optional); `getFlightStatusCooldown(flight: enhancedFlight, now?: Date): { allowed: boolean; nextCheckAt: Date | null }` — consumed by Task 3 (FlightDetailsPanel).

- [ ] **Step 1: Add the new fields to the flight type**

In `src/types/enhancedFlight.ts`, add inside the `enhancedFlight` interface (after `aircraft_type_name`):

```ts
  /** Raw AeroDataBox response for the matching leg, or null if never checked. */
  flight_status?: Record<string, unknown> | null;
  /** ISO timestamp of the last successful status check. */
  flight_status_checked_at?: string | null;
```

- [ ] **Step 2: Write the failing cooldown tests**

Create `src/utils/flightStatusCooldown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getFlightStatusCooldown } from "./flightStatusCooldown";
import type { enhancedFlight } from "../types/enhancedFlight";

const baseFlight: enhancedFlight = {
  id: "1",
  departure_date: "2026-09-20",
  departure_time: "14:30",
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  airline_iata: "QF",
  flight_number: "1",
  airline_icao: null,
  departure_coordinates: null,
  arrival_coordinates: null,
  distance_km: null,
  flight_time: null,
  departure_country: null,
  arrival_country: null,
  international: false,
  airline_name: null,
  airline_icon_path: null,
  flight_status: null,
  flight_status_checked_at: null,
};

describe("getFlightStatusCooldown", () => {
  it("allows checking immediately when never checked before", () => {
    const result = getFlightStatusCooldown(baseFlight, new Date("2026-09-01T00:00:00Z"));
    expect(result).toEqual({ allowed: true, nextCheckAt: null });
  });

  it("blocks re-checking within 24h when departure is far away", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      departure_date: "2026-10-01",
      flight_status: { status: "Expected" },
      flight_status_checked_at: "2026-09-01T00:00:00.000Z",
    };
    const result = getFlightStatusCooldown(flight, new Date("2026-09-01T10:00:00Z"));
    expect(result.allowed).toBe(false);
    expect(result.nextCheckAt).toEqual(new Date("2026-09-02T00:00:00.000Z"));
  });

  it("allows re-checking once 24h have passed", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      departure_date: "2026-10-01",
      flight_status: { status: "Expected" },
      flight_status_checked_at: "2026-09-01T00:00:00.000Z",
    };
    const result = getFlightStatusCooldown(flight, new Date("2026-09-02T00:00:01Z"));
    expect(result).toEqual({ allowed: true, nextCheckAt: null });
  });

  it("tightens to a 1h cooldown within 2h of departure", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      departure_date: "2026-09-01",
      departure_time: "12:00",
      flight_status: { status: "EnRoute" },
      flight_status_checked_at: "2026-09-01T10:30:00.000Z",
    };
    // now: 11:00 UTC, 1h since last check, departure at 12:00 is within 2h
    const result = getFlightStatusCooldown(flight, new Date("2026-09-01T11:00:00Z"));
    expect(result.allowed).toBe(false);
    expect(result.nextCheckAt).toEqual(new Date("2026-09-01T11:30:00.000Z"));
  });

  it("allows re-checking after the 1h near-departure cooldown elapses", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      departure_date: "2026-09-01",
      departure_time: "12:00",
      flight_status: { status: "EnRoute" },
      flight_status_checked_at: "2026-09-01T10:30:00.000Z",
    };
    const result = getFlightStatusCooldown(flight, new Date("2026-09-01T11:30:01Z"));
    expect(result.allowed).toBe(true);
  });

  it("locks out further checks once a terminal status has been observed", () => {
    const flight: enhancedFlight = {
      ...baseFlight,
      flight_status: { status: "Landed" },
      flight_status_checked_at: "2026-09-01T00:00:00.000Z",
    };
    // far in the future, well past any cooldown - still locked
    const result = getFlightStatusCooldown(flight, new Date("2027-01-01T00:00:00Z"));
    expect(result).toEqual({ allowed: false, nextCheckAt: null });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run vitest -- src/utils/flightStatusCooldown.test.ts`
Expected: FAIL with "Cannot find module './flightStatusCooldown'"

- [ ] **Step 4: Implement the cooldown helper**

Create `src/utils/flightStatusCooldown.ts`:

```ts
import { parseToDate, parseHourMinute } from "./dateUtils";
import type { enhancedFlight } from "../types/enhancedFlight";

const HOUR_MS = 60 * 60 * 1000;
const NEAR_DEPARTURE_WINDOW_MS = 2 * HOUR_MS;
const NEAR_DEPARTURE_COOLDOWN_MS = HOUR_MS;
const DEFAULT_COOLDOWN_MS = 24 * HOUR_MS;

// AeroDataBox's full status enum isn't publicly documented; match loosely
// against the terminal-state families rather than an exhaustive list.
const TERMINAL_STATUS_PATTERN = /landed|cancelled|diverted/i;

export interface FlightStatusCooldown {
  allowed: boolean;
  nextCheckAt: Date | null;
}

// ponytail: combines a UTC calendar date with a local wall-clock time as if
// both were UTC - the rest of the app never tracks per-airport timezones for
// departure_time either, so this only ever mis-estimates the 2h-before-departure
// window by the airport's UTC offset, not the stored data. Add real timezone
// lookups if the window needs to be exact.
const getDepartureDateTime = (flight: enhancedFlight): Date | null => {
  const date = parseToDate(flight.departure_date);
  if (!date) return null;
  const time = parseHourMinute(flight.departure_time);
  if (!time) return date;
  const combined = new Date(date);
  combined.setUTCHours(time.hours, time.minutes, 0, 0);
  return combined;
};

const isTerminalStatus = (flight: enhancedFlight): boolean => {
  const status = (
    flight.flight_status as { status?: unknown } | null | undefined
  )?.status;
  return typeof status === "string" && TERMINAL_STATUS_PATTERN.test(status);
};

/**
 * Decides whether the "check status" button should be enabled for a flight.
 * Once a terminal status (landed/cancelled/diverted) has been observed,
 * checking again teaches us nothing new, so it locks out for good.
 * Otherwise the cooldown tightens to hourly within 2 hours of departure,
 * daily otherwise.
 */
export function getFlightStatusCooldown(
  flight: enhancedFlight,
  now: Date = new Date(),
): FlightStatusCooldown {
  const checkedAt = flight.flight_status_checked_at
    ? parseToDate(flight.flight_status_checked_at)
    : null;

  if (!checkedAt) {
    return { allowed: true, nextCheckAt: null };
  }

  if (isTerminalStatus(flight)) {
    return { allowed: false, nextCheckAt: null };
  }

  const departure = getDepartureDateTime(flight);
  const nearDeparture =
    departure !== null &&
    Math.abs(departure.getTime() - now.getTime()) <= NEAR_DEPARTURE_WINDOW_MS;

  const cooldownMs = nearDeparture
    ? NEAR_DEPARTURE_COOLDOWN_MS
    : DEFAULT_COOLDOWN_MS;

  const nextCheckAt = new Date(checkedAt.getTime() + cooldownMs);
  const allowed = now.getTime() >= nextCheckAt.getTime();
  return { allowed, nextCheckAt: allowed ? null : nextCheckAt };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run vitest -- src/utils/flightStatusCooldown.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types/enhancedFlight.ts src/utils/flightStatusCooldown.ts src/utils/flightStatusCooldown.test.ts
git commit -m "feat: add flight status fields and check-status cooldown rule"
```

---

### Task 2: Netlify proxy function

**Files:**
- Create: `netlify.toml`
- Create: `netlify/functions/flight-status.js`
- Test: `netlify/functions/flight-status.test.js`
- Modify: `eslint.config.js`
- Modify: `.env.example`

**Interfaces:**
- Produces: `GET /.netlify/functions/flight-status?flightNumber=<IATA+number>&date=<YYYY-MM-DD>` → proxies to `https://aerodatabox.p.rapidapi.com/flights/number/{flightNumber}/{date}`, returns AeroDataBox's JSON array body and status code unchanged. Consumed by Task 3 (`flightStatusService.ts`).

- [ ] **Step 1: Add the Netlify functions directory config**

Create `netlify.toml`:

```toml
[functions]
  directory = "netlify/functions"
```

- [ ] **Step 2: Add the env var placeholder**

In `.env.example`, add a new section (this one is server-side only, deliberately not `VITE_`-prefixed):

```
# AeroDataBox (RapidAPI) flight status - server-side only, read by
# netlify/functions/flight-status.js. Never prefix with VITE_.
RAPIDAPI_AERODATABOX_KEY=
```

- [ ] **Step 3: Write the failing function tests**

Create `netlify/functions/flight-status.test.js`:

```js
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
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm run vitest -- netlify/functions/flight-status.test.js`
Expected: FAIL with "Cannot find module './flight-status.js'"

- [ ] **Step 5: Implement the function**

Create `netlify/functions/flight-status.js`:

```js
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
```

- [ ] **Step 6: Give the functions directory Node globals in ESLint**

In `eslint.config.js`, add a new block to the exported array (after the `**/*.{js,jsx}` block, before the TypeScript block):

```js
  {
    files: ["netlify/functions/**/*.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run vitest -- netlify/functions/flight-status.test.js`
Expected: PASS (3 tests)

- [ ] **Step 8: Lint**

Run: `npm run lint`
Expected: no errors in `netlify/functions/flight-status.js`

- [ ] **Step 9: Commit**

```bash
git add netlify.toml netlify/functions/flight-status.js netlify/functions/flight-status.test.js eslint.config.js .env.example
git commit -m "feat: add AeroDataBox flight status proxy function"
```

- [ ] **Step 10 (manual, not automatable): configure the real key**

Add `RAPIDAPI_AERODATABOX_KEY` in the Netlify dashboard (Site settings → Environment variables) and in your local `.env.local` (not `.env.example`, which stays blank). Since the current key was pasted into a chat transcript earlier, regenerate it on RapidAPI first and use the fresh one here.

---

### Task 3: Client service — fetch and persist status

**Files:**
- Create: `src/utils/flightStatusService.ts`
- Test: `src/utils/flightStatusService.test.ts`

**Interfaces:**
- Consumes: `updateFlightForUser(uid: string, flightId: string, updates: Partial<FirestoreFlightRecord>): Promise<...>` from `src/utils/flightService.ts:305`; the `/.netlify/functions/flight-status` endpoint from Task 2.
- Produces: `checkFlightStatus(uid: string, flight: enhancedFlight): Promise<Record<string, unknown>>`, `class FlightStatusError extends Error { status: number }` — both consumed by Task 4 (`FlightDetailsPanel`).

- [ ] **Step 1: Write the failing tests**

Create `src/utils/flightStatusService.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const flightServiceMocks = vi.hoisted(() => ({
  updateFlightForUser: vi.fn(),
}));

vi.mock("./flightService", () => flightServiceMocks);

import { checkFlightStatus, FlightStatusError } from "./flightStatusService";
import type { enhancedFlight } from "../types/enhancedFlight";

const baseFlight: enhancedFlight = {
  id: "1",
  departure_date: "2026-09-20",
  departure_time: "14:30",
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  airline_iata: "QF",
  flight_number: "1",
  airline_icao: null,
  departure_coordinates: null,
  arrival_coordinates: null,
  distance_km: null,
  flight_time: null,
  departure_country: null,
  arrival_country: null,
  international: false,
  airline_name: null,
  airline_icon_path: null,
};

describe("checkFlightStatus", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    flightServiceMocks.updateFlightForUser.mockReset();
  });

  it("fetches the matching leg and saves it to Firestore", async () => {
    const legs = [
      {
        status: "Expected",
        departure: { airport: { iata: "SYD" } },
        arrival: { airport: { iata: "SIN" } },
      },
      {
        status: "Expected",
        departure: { airport: { iata: "MEL" } },
        arrival: { airport: { iata: "SIN" } },
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(legs) }),
    );

    const result = await checkFlightStatus("uid-1", baseFlight);

    expect(result).toEqual(legs[0]);
    expect(flightServiceMocks.updateFlightForUser).toHaveBeenCalledWith(
      "uid-1",
      "1",
      expect.objectContaining({ flight_status: legs[0] }),
    );
  });

  it("requests the flight number and ISO date it was built from", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toThrow(
      FlightStatusError,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/.netlify/functions/flight-status?flightNumber=QF1&date=2026-09-20",
    );
  });

  it("throws when no leg matches the flight's airports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              status: "Expected",
              departure: { airport: { iata: "MEL" } },
              arrival: { airport: { iata: "SIN" } },
            },
          ]),
      }),
    );

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toThrow(
      FlightStatusError,
    );
    expect(flightServiceMocks.updateFlightForUser).not.toHaveBeenCalled();
  });

  it("throws without calling fetch when the flight has no flight number", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      checkFlightStatus("uid-1", { ...baseFlight, flight_number: null }),
    ).rejects.toThrow(FlightStatusError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when the proxy responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    await expect(checkFlightStatus("uid-1", baseFlight)).rejects.toThrow(
      FlightStatusError,
    );
    expect(flightServiceMocks.updateFlightForUser).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run vitest -- src/utils/flightStatusService.test.ts`
Expected: FAIL with "Cannot find module './flightStatusService'"

- [ ] **Step 3: Implement the service**

Create `src/utils/flightStatusService.ts`:

```ts
import { parseToDate } from "./dateUtils";
import { updateFlightForUser } from "./flightService";
import type { enhancedFlight } from "../types/enhancedFlight";

type FlightLeg = {
  status?: string;
  departure?: { airport?: { iata?: string } };
  arrival?: { airport?: { iata?: string } };
  [key: string]: unknown;
};

export class FlightStatusError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FlightStatusError";
    this.status = status;
  }
}

// departure_date is stored/read as a UTC calendar date (see the fix in #60);
// AeroDataBox's date param expects that same calendar date.
const toIsoDate = (flight: enhancedFlight): string | null => {
  const d = parseToDate(flight.departure_date);
  if (!d) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// A flight number/date can match more than one leg near a date boundary
// (e.g. QF1 SIN->LHR departing just before/after midnight UTC on either
// side of the requested date) - the airports pin down the right one.
const findMatchingLeg = (
  legs: FlightLeg[],
  flight: enhancedFlight,
): FlightLeg | null =>
  legs.find(
    (leg) =>
      leg.departure?.airport?.iata === flight.departure_airport_iata &&
      leg.arrival?.airport?.iata === flight.arrival_airport_iata,
  ) ?? null;

/**
 * Fetches live status for a flight through the flight-status proxy function
 * and persists the matching leg onto the flight's Firestore document.
 */
export async function checkFlightStatus(
  uid: string,
  flight: enhancedFlight,
): Promise<FlightLeg> {
  if (!flight.flight_number) {
    throw new FlightStatusError("Flight has no flight number", 400);
  }

  const date = toIsoDate(flight);
  if (!date) {
    throw new FlightStatusError("Flight has no valid departure date", 400);
  }

  const flightNumber = `${flight.airline_iata}${flight.flight_number}`;
  const response = await fetch(
    `/.netlify/functions/flight-status?flightNumber=${encodeURIComponent(flightNumber)}&date=${encodeURIComponent(date)}`,
  );

  if (!response.ok) {
    throw new FlightStatusError(
      `Flight status request failed (${response.status})`,
      response.status,
    );
  }

  const legs = (await response.json()) as FlightLeg[];
  const match = findMatchingLeg(legs, flight);
  if (!match) {
    throw new FlightStatusError("No matching flight found", 404);
  }

  await updateFlightForUser(uid, flight.id, {
    flight_status: match,
    flight_status_checked_at: new Date().toISOString(),
  });

  return match;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run vitest -- src/utils/flightStatusService.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/flightStatusService.ts src/utils/flightStatusService.test.ts
git commit -m "feat: add client service to fetch and persist flight status"
```

---

### Task 4: FlightDetailsPanel + locale strings

**Files:**
- Create: `src/components/FlightDetailsPanel.tsx`
- Test: `src/components/FlightDetailsPanel.test.tsx`
- Modify: `public/locales/en/flights.json`
- Modify: `public/locales/it/flights.json`

**Interfaces:**
- Consumes: `getFlightStatusCooldown` (Task 1), `checkFlightStatus`/`FlightStatusError` (Task 3), `useAuth()` from `src/context/AuthContext.jsx` (returns `{ user }`, `user.uid`).
- Produces: `<FlightDetailsPanel flight={enhancedFlight} />` — consumed by Task 5 (`FlightsList.tsx`).

- [ ] **Step 1: Add the locale strings**

In `public/locales/en/flights.json`, add `"view_details": "View details"` inside the existing `"actions"` object, and a new top-level `"status"` object (place it after `"actions"`):

```json
  "status": {
    "title": "Flight status",
    "status_label": "Status:",
    "unknown": "Unknown",
    "no_data": "No live status checked yet.",
    "no_flight_number": "This flight has no flight number, so status can't be looked up.",
    "check_button": "Check status",
    "check_success_title": "Status updated",
    "check_error_title": "Could not check status",
    "checked_at": "Last checked: {{value}}",
    "next_check_at": "Available again at {{value}}",
    "no_further_checks": "This flight has landed - no further checks needed",
    "departure_delay": "Departure delay: {{value}} min",
    "arrival_delay": "Arrival delay: {{value}} min",
    "departure_gate": "Departure gate {{gate}}, terminal {{terminal}}",
    "arrival_gate": "Arrival gate {{gate}}, terminal {{terminal}}",
    "aircraft": "Aircraft: {{model}} ({{reg}})"
  },
```

In `public/locales/it/flights.json`, add `"view_details": "Visualizza dettagli"` inside `"actions"`, and the matching `"status"` object:

```json
  "status": {
    "title": "Stato del volo",
    "status_label": "Stato:",
    "unknown": "Sconosciuto",
    "no_data": "Nessuno stato in tempo reale ancora verificato.",
    "no_flight_number": "Questo volo non ha un numero di volo, quindi lo stato non può essere verificato.",
    "check_button": "Verifica stato",
    "check_success_title": "Stato aggiornato",
    "check_error_title": "Impossibile verificare lo stato",
    "checked_at": "Ultimo controllo: {{value}}",
    "next_check_at": "Disponibile di nuovo alle {{value}}",
    "no_further_checks": "Questo volo è atterrato - nessun ulteriore controllo necessario",
    "departure_delay": "Ritardo in partenza: {{value}} min",
    "arrival_delay": "Ritardo in arrivo: {{value}} min",
    "departure_gate": "Gate partenza {{gate}}, terminal {{terminal}}",
    "arrival_gate": "Gate arrivo {{gate}}, terminal {{terminal}}",
    "aircraft": "Aereo: {{model}} ({{reg}})"
  },
```

- [ ] **Step 2: Write the failing component tests**

Create `src/components/FlightDetailsPanel.test.tsx`:

```tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "../../test-utils";
import FlightDetailsPanel from "./FlightDetailsPanel";
import type { enhancedFlight } from "../types/enhancedFlight";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "uid-1" } }),
}));

const checkFlightStatusMock = vi.fn();
vi.mock("../utils/flightStatusService", () => ({
  checkFlightStatus: (...args: unknown[]) => checkFlightStatusMock(...args),
}));

const baseFlight: enhancedFlight = {
  id: "1",
  departure_date: "2026-09-20",
  departure_time: "14:30",
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  airline_iata: "QF",
  flight_number: "1",
  airline_icao: null,
  departure_coordinates: null,
  arrival_coordinates: null,
  distance_km: null,
  flight_time: null,
  departure_country: null,
  arrival_country: null,
  international: false,
  airline_name: null,
  airline_icon_path: null,
  flight_status: null,
  flight_status_checked_at: null,
};

describe("FlightDetailsPanel", () => {
  beforeEach(() => {
    checkFlightStatusMock.mockReset();
  });

  it("shows the check button and calls checkFlightStatus on click", async () => {
    checkFlightStatusMock.mockResolvedValue({ status: "Expected" });
    render(<FlightDetailsPanel flight={baseFlight} />);

    const button = screen.getByTestId("flight-status-check-1");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(checkFlightStatusMock).toHaveBeenCalledWith("uid-1", baseFlight),
    );
  });

  it("renders stored status data", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: { status: "Landed" },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Landed")).toBeInTheDocument();
  });

  it("hides the check button when the flight has no flight number", () => {
    render(
      <FlightDetailsPanel flight={{ ...baseFlight, flight_number: null }} />,
    );
    expect(
      screen.queryByTestId("flight-status-check-1"),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run vitest -- src/components/FlightDetailsPanel.test.tsx`
Expected: FAIL with "Cannot find module './FlightDetailsPanel'"

- [ ] **Step 4: Implement the component**

Create `src/components/FlightDetailsPanel.tsx`:

```tsx
import React, { useState } from "react";
import { Badge, Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../context/AuthContext";
import type { enhancedFlight } from "../types/enhancedFlight";
import { getFlightStatusCooldown } from "../utils/flightStatusCooldown";
import { checkFlightStatus } from "../utils/flightStatusService";

interface FlightDetailsPanelProps {
  flight: enhancedFlight;
}

type FlightLegTime = {
  scheduledTime?: { utc?: string };
  revisedTime?: { utc?: string };
  terminal?: string;
  gate?: string;
};
type FlightLeg = {
  status?: string;
  departure?: FlightLegTime;
  arrival?: FlightLegTime;
  aircraft?: { model?: string; reg?: string };
};

const parseUtc = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
};

// AeroDataBox doesn't return a delay field directly - it's the gap between
// the original schedule and the revised one.
const getDelayMinutes = (leg: FlightLegTime | undefined): number | null => {
  const scheduled = parseUtc(leg?.scheduledTime?.utc);
  const revised = parseUtc(leg?.revisedTime?.utc);
  if (!scheduled || !revised) return null;
  const diff = Math.round((revised.getTime() - scheduled.getTime()) / 60000);
  return diff === 0 ? null : diff;
};

const FlightDetailsPanel: React.FC<FlightDetailsPanelProps> = ({ flight }) => {
  const { t } = useTranslation(["flights"]);
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const statusData = flight.flight_status as FlightLeg | null | undefined;
  const cooldown = getFlightStatusCooldown(flight);
  const hasFlightNumber = Boolean(flight.flight_number);

  const departureDelay = getDelayMinutes(statusData?.departure);
  const arrivalDelay = getDelayMinutes(statusData?.arrival);

  const handleCheck = async () => {
    if (!user?.uid) {
      notifications.show({
        title: t("actions.not_signed_in"),
        message: "",
        color: "red",
      });
      return;
    }
    setIsChecking(true);
    try {
      await checkFlightStatus(user.uid, flight);
      notifications.show({
        title: t("status.check_success_title"),
        message: "",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: t("status.check_error_title"),
        message: (err instanceof Error && err.message) || String(err),
        color: "red",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const buttonDisabled = !hasFlightNumber || !cooldown.allowed || isChecking;

  return (
    <Stack gap="sm">
      {statusData ? (
        <Stack gap="xs">
          <Group gap="xs">
            <Text fw={500}>{t("status.status_label")}</Text>
            <Badge variant="light">
              {statusData.status ?? t("status.unknown")}
            </Badge>
          </Group>
          {departureDelay !== null && (
            <Text size="sm">
              {t("status.departure_delay", { value: departureDelay })}
            </Text>
          )}
          {arrivalDelay !== null && (
            <Text size="sm">
              {t("status.arrival_delay", { value: arrivalDelay })}
            </Text>
          )}
          {(statusData.departure?.gate || statusData.departure?.terminal) && (
            <Text size="sm">
              {t("status.departure_gate", {
                gate: statusData.departure?.gate ?? "-",
                terminal: statusData.departure?.terminal ?? "-",
              })}
            </Text>
          )}
          {(statusData.arrival?.gate || statusData.arrival?.terminal) && (
            <Text size="sm">
              {t("status.arrival_gate", {
                gate: statusData.arrival?.gate ?? "-",
                terminal: statusData.arrival?.terminal ?? "-",
              })}
            </Text>
          )}
          {(statusData.aircraft?.model || statusData.aircraft?.reg) && (
            <Text size="sm">
              {t("status.aircraft", {
                model: statusData.aircraft?.model ?? "-",
                reg: statusData.aircraft?.reg ?? "-",
              })}
            </Text>
          )}
          {flight.flight_status_checked_at && (
            <Text size="xs" c="dimmed">
              {t("status.checked_at", {
                value: flight.flight_status_checked_at,
              })}
            </Text>
          )}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          {t("status.no_data")}
        </Text>
      )}

      {!hasFlightNumber ? (
        <Text size="sm" c="dimmed">
          {t("status.no_flight_number")}
        </Text>
      ) : (
        <Tooltip
          disabled={cooldown.allowed}
          label={
            cooldown.nextCheckAt
              ? t("status.next_check_at", {
                  value: cooldown.nextCheckAt.toLocaleString(),
                })
              : t("status.no_further_checks")
          }
        >
          <span>
            <Button
              onClick={handleCheck}
              loading={isChecking}
              disabled={buttonDisabled}
              style={buttonDisabled ? { pointerEvents: "none" } : undefined}
              data-testid={`flight-status-check-${flight.id}`}
            >
              {t("status.check_button")}
            </Button>
          </span>
        </Tooltip>
      )}
    </Stack>
  );
};

export default FlightDetailsPanel;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run vitest -- src/components/FlightDetailsPanel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/FlightDetailsPanel.tsx src/components/FlightDetailsPanel.test.tsx public/locales/en/flights.json public/locales/it/flights.json
git commit -m "feat: add flight status details panel"
```

---

### Task 5: Wire "View details" into FlightActions and FlightsList

**Files:**
- Modify: `src/components/FlightActions.jsx`
- Modify: `src/components/FlightActions.d.ts`
- Modify: `src/components/FlightsList.tsx`

**Interfaces:**
- Consumes: `FlightDetailsPanel` (Task 4); existing `FlightActions` menu pattern (`src/components/FlightActions.jsx:48-74`); existing edit-modal state pattern in `src/components/FlightsList.tsx:32-35,226-239`.

- [ ] **Step 1: Add the "View details" menu item to FlightActions**

In `src/components/FlightActions.jsx`, update the icon import and add a new prop and menu item:

```jsx
import { IconDotsVertical, IconInfoCircle, IconPencil, IconTrash } from "@tabler/icons-react";
```

```jsx
const FlightActions = ({ flight, onEdit, onViewDetails }) => {
```

Add this `Menu.Item` as the first item inside `<Menu.Dropdown>`, before the existing "Edit" item:

```jsx
          <Menu.Item
            leftSection={<IconInfoCircle size={14} />}
            onClick={() => onViewDetails && onViewDetails(flight)}
            data-testid={`flight-actions-details-${flight.id}`}
          >
            {t("actions.view_details")}
          </Menu.Item>
```

- [ ] **Step 2: Update the FlightActions type declaration**

In `src/components/FlightActions.d.ts`:

```ts
export interface FlightActionsProps {
  flight: enhancedFlight;
  onEdit?: (flight: enhancedFlight) => void;
  onViewDetails?: (flight: enhancedFlight) => void;
}
```

- [ ] **Step 3: Wire the details modal into FlightsList**

In `src/components/FlightsList.tsx`:

Add the lazy import next to the existing ones (after the `FlightEntryForm` lazy import, around line 21):

```tsx
const FlightDetailsPanel = lazy(() => import("./FlightDetailsPanel"));
```

Add state next to the existing edit-modal state (around line 32-35):

```tsx
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsFlight, setDetailsFlight] = React.useState<enhancedFlight | null>(
    null,
  );
```

Pass the new callback to `FlightActions` (in the row render, around line 202-208):

```tsx
                      <Suspense fallback={<Loader size="sm" />}>
                        <FlightActions
                          flight={flight}
                          onEdit={(f: enhancedFlight) => {
                            setEditFlight(f);
                            setEditOpen(true);
                          }}
                          onViewDetails={(f: enhancedFlight) => {
                            setDetailsFlight(f);
                            setDetailsOpen(true);
                          }}
                        />
                      </Suspense>
```

Add a second `Modal` next to the existing edit `Modal` (after it, around line 239):

```tsx
      <Modal
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={t("status.title")}
      >
        {detailsFlight && (
          <Suspense fallback={<Loader size="sm" />}>
            <FlightDetailsPanel flight={detailsFlight} />
          </Suspense>
        )}
      </Modal>
```

- [ ] **Step 4: Run the existing FlightsList tests to confirm nothing regressed**

Run: `npm run vitest -- src/components/FlightsList.test.tsx`
Expected: PASS (2 tests, unchanged)

- [ ] **Step 5: Lint the whole change set**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 6: Manual smoke check**

Run `npm run dev`, open a flight row's action menu, click "View details" — confirm the modal opens showing "No live status checked yet." and an enabled "Check status" button (this call will fail until the real `RAPIDAPI_AERODATABOX_KEY` is set per Task 2 Step 10 and the app is running through `netlify dev` rather than plain `vite dev`, since `vite dev` doesn't serve `/.netlify/functions/*`).

- [ ] **Step 7: Commit**

```bash
git add src/components/FlightActions.jsx src/components/FlightActions.d.ts src/components/FlightsList.tsx
git commit -m "feat: wire flight status details modal into the flights list"
```
