# Flight status enrichment (AeroDataBox) — design

Date: 2026-09-19
Issue: #62 follow-up discussion (no issue filed yet — file on approval)

## Problem

Flights logged in fly-log only carry what the user entered at log time
(schedule, route, airline). There's no way to see live status (delayed,
gate, aircraft tail number/model) for a flight, before or after it happens.

## Decisions made during brainstorming

- **Data source:** AeroDataBox via RapidAPI, free tier (600 units/month).
  Chosen over API.Market (time-limited trial) and the direct AeroDataBox
  account (no free tier). See conversation for pricing comparison.
- **Trigger model:** manual only. No scheduled/automatic fetching — that
  needs a cron-triggered Netlify function and would burn quota on every
  logged flight regardless of user interest. Automatic fetching is
  explicitly deferred until/unless the API cost is funded by a paid tier
  (a monetization question, not a v1 engineering one).
- **Backfill of Federico's own historical flights:** out of scope for this
  build. Will be a locally-run script, not a shipped feature — separate
  follow-up.
- **Aircraft-type stats charts:** out of scope for this build. Follow-up
  once the personal backfill shows what data AeroDataBox actually returns
  for older flights.
- **Rate limiting:** client-side only, not enforced in the serverless
  function. Users are trusted/authenticated and volume is tiny; server-side
  enforcement would require the function to read Firestore (Admin SDK +
  credentials) for a risk that doesn't exist at this scale. Documented as a
  deliberate shortcut.

## Design

### 1. Data model

Add two fields to `enhancedFlight` (`src/types/enhancedFlight.ts`):

```ts
flight_status?: Record<string, unknown> | null; // raw AeroDataBox response
flight_status_checked_at?: string | null; // ISO timestamp of last check
```

Storing the raw response (rather than a field per data point) means new
data AeroDataBox returns — gate, terminal, aircraft reg, delay minutes —
is available to the UI without another migration. The UI only reads the
sub-fields it currently displays.

### 2. Backend: serverless proxy

New file `netlify/functions/flight-status.js`. Netlify auto-detects
`netlify/functions`; add a minimal `netlify.toml` if one doesn't already
configure the functions directory.

- Input: flight number (IATA) + date, as query params.
- Reads `RAPIDAPI_AERODATABOX_KEY` from Netlify env (server-side only,
  **not** prefixed `VITE_` — that would ship it in the client bundle).
- Calls AeroDataBox's flight-by-number-and-date endpoint, returns the JSON
  body straight through.
- No caching, no queue — one request in, one response out.
- 404 (flight not found) and 429 (quota exhausted) pass through as-is;
  the client decides how to display them.

### 3. Frontend: cooldown helper

New pure function, e.g. `src/utils/flightStatusCooldown.ts`:

```ts
nextCheckAllowedAt(flight: enhancedFlight): Date | null
```

Rules (based on `flight.flight_status?.status` and time to
`departure_date`/`departure_time`):

- Landed **and** already checked once post-arrival → returns `null`
  meaning of type "never again" (button permanently disabled for this
  flight — nothing left to learn).
- Departure within 2 hours (or flight in progress) → 1 hour after
  `flight_status_checked_at`.
- Otherwise → 24 hours after `flight_status_checked_at`.
- No `flight_status_checked_at` yet → always allowed (returns a date in
  the past).

This is the one piece of non-trivial logic in the feature and gets a
`test_*`/`*.test.ts` file with a case per rule.

### 4. Frontend: UI

- **Flight details modal** (`FlightDetailsModal.tsx`), opened by clicking
  a flight row in `FlightsList.tsx` / an icon in `FlightActions.jsx` —
  reuses the existing `Modal` pattern already used for `FlightEntryForm`
  editing in `FlightsList.tsx`.
- Shows: status badge (Scheduled / En Route / Landed / Cancelled /
  Diverted) with delay in minutes if present, gate/terminal when
  AeroDataBox returns them, aircraft model + registration.
- A "Check status" `Button`, disabled with a tooltip
  ("available again at HH:MM" / "no further updates for this flight")
  when `nextCheckAllowedAt` is in the future or `null`.
- On click: call the Netlify function, then write `flight_status` +
  `flight_status_checked_at` onto the flight's Firestore doc via the
  existing `flightService` update path. Store re-renders from the
  Firestore listener as normal.
- Failure (404/429/network): a toast, no change to stored data, no
  retries. This is enrichment — failure here must stay invisible to the
  rest of the app.

### Out of scope (this build)

- Automatic/scheduled status fetching
- Backfilling historical flights (any user's)
- Stats/charts using aircraft type or delay data
- Server-side rate limit enforcement

## Testing

- `flightStatusCooldown.test.ts`: one case per cooldown rule above.
- A component test confirming the "Check status" button is disabled when
  `nextCheckAllowedAt` is in the future, and calls the function/write path
  when enabled.
