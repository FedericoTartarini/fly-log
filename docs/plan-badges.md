# Badges — implementation plan

Twenty collectable badges, computed on the fly from past flights. Own page at
`/badges`, advertised by a strip on the stats dashboard.

Decided in the design session of 2026-09-13. The reasoning behind what was cut
is in the "Not doing" section at the end — read it before adding anything back.

## Shape of the work

Six files changed, eight created. No new dependency, no Firestore schema
change, no new store state.

| File | Change |
| --- | --- |
| `src/utils/badges.ts` | **new** — the catalogue and the pure evaluator |
| `src/utils/badges.test.ts` | **new** — vitest over the evaluator |
| `src/utils/barcode.ts` | **new** — per-badge decorative barcode pattern |
| `src/pages/Badges.jsx` | **new** — the shelf |
| `src/components/BadgeTile.jsx` | **new** — one badge, boarding pass or stamp |
| `src/components/BadgeTile.module.css` | **new** — perforation, barcode, stamp |
| `src/components/BadgeStrip.jsx` | **new** — recent unlocks, for the stats page |
| `src/constants/badgeIcons.ts` | **new** — badge id to tabler icon |
| `src/constants/distances.ts` | **new** — Earth/Moon/Mars reference distances |
| `src/components/DistanceStatsCard.tsx` | imports those distances instead of its own |
| `src/main.jsx` | route entry, lazy, wrapped in `ProtectedRoute` |
| `src/constants/MyClasses.ts` | `PATHS.BADGES = "/badges"` |
| `src/pages/MyAppShell.jsx` | nav item (logged-in only, after Timeline) |
| `src/pages/FlightsStats.jsx` | render `<BadgeStrip />` |
| `public/locales/{en,it}/flights.json` | a `badges` block |

## `src/utils/badges.ts`

Pure. No React, no i18n — it returns ids and numbers, the page translates them.

```ts
export interface Badge {
  id: string;            // "once_around" — i18n key suffix and React key
  unlocked: boolean;
  unlockedOn?: Date;     // departure date of the flight that crossed the target
  current?: number;      // both omitted for binary badges (see Q16)
  target?: number;
  category: BadgeCategory; // "flights" | "distance" | "places" | "habit"
}

export const evaluateBadges = (
  flights: enhancedFlight[] | null | undefined,
  now?: Date,
): Badge[] => { ... }
```

Icons are deliberately absent: they live in `src/constants/badgeIcons.ts`, so
the evaluator stays free of UI.

### Inputs

`allFlights`, filtered to **past flights only** and sorted by `departure_date`
ascending, then replayed. The whole of today counts as upcoming, matching the
PAST year filter in `store.ts` — a date-only `departure_date` parses to
midnight, so comparing against the current time would count a flight departing
in a few hours as already taken. Two consequences, both wanted:

- A flight booked for next month unlocks nothing until it has been taken.
- `unlockedOn` is the date of the flight that crossed the threshold, so it is
  deterministic — no stored timestamp, nothing to write, nothing to migrate.

The badge page reads `allFlights`, **not** `filteredFlights`. Badges are
lifetime facts; the global year filter must not touch them. `Timeline.jsx:58`
already does this deliberately and has a comment saying why — match it.

### The catalogue

Every predicate uses fields that already exist on an enhanced flight.

| # | id | Criterion | Source |
| --- | --- | --- | --- |
| 1 | `first_flight` | 1 flight | count |
| 2 | `border_crossed` | a flight with `departure_country !== arrival_country` | `*_country` |
| 3 | `long_hauler` | a flight of ≥ 5,000 km | `distance_km` |
| 4 | `ten_up` | 10 flights | count |
| 5 | `half_century` | 50 flights | count |
| 6 | `century` | 100 flights | count |
| 7 | `two_fifty` | 250 flights | count |
| 8 | `five_hundred` | 500 flights | count |
| 9 | `once_around` | 40,075 km total | `distance_km` |
| 10 | `five_laps` | 200,375 km total | `distance_km` |
| 11 | `to_the_moon` | 384,400 km total | `distance_km` |
| 12 | `there_and_back` | 768,800 km total (Moon round trip) | `distance_km` |
| 13 | `million_club` | 1,000,000 km total | `distance_km` |
| 14 | `explorer` | 5 distinct countries | `*_country` |
| 15 | `globetrotter` | 10 distinct countries | `*_country` |
| 16 | `well_travelled` | 25 distinct countries | `*_country` |
| 17 | `country_collector` | 50 distinct countries | `*_country` |
| 18 | `terminal_regular` | 25 distinct airports | `*_airport_iata` |
| 19 | `on_a_roll` | 6 consecutive months with a flight | month streak |
| 20 | `ten_years_running` | 10 consecutive years with a flight | year streak |

Badges 1–3 are binary: no `current`, no `target`, no progress bar. The rest
carry both and render a bar.

The Earth and Moon thresholds are the same constants already in
`DistanceStatsCard.tsx:18` (`EARTH_CIRCUMFERENCE`, `DISTANCE_TO_MOON`). Export
them from there rather than retyping the numbers, so the shelf and the card can
never disagree.

### The one badge that needs new maths

`on_a_roll` and `ten_years_running`. `getMonthMatrixStats` counts *active*
months but does **not** compute a consecutive run — the issue's claim that a streak is "a few lines on
the same data" is nearly right but not free.

Build on `getFlightMonthMatrix(flights, CHART_METRIC.FLIGHTS)`, flatten
`{years, counts}` to absolute month indices (`year * 12 + month`), and walk them
sorted, counting runs. That handles the December→January boundary, which a
per-year walk gets wrong.

### Test

One `badges.test.ts`. Not a case per badge — the predicates are one-liners. Test
the three things that can actually break:

1. An upcoming flight unlocks nothing.
2. `unlockedOn` is the date of the triggering flight, not of the newest flight.
3. A streak spanning a year boundary (Nov, Dec, Jan) counts as 3, not 2.

## `src/pages/Badges.jsx`

Four sections — Flights, Distance, Places, Habit — each headed by a divider
carrying the section name and an "n of m" count. Inside each section:

1. Unlocked, newest `unlockedOn` first.
2. Locked, by `current / target` descending.

Binary locked badges have no ratio; sort them last within a section.

The grouping costs the page its old "what is next" reading, where the nearest
locked badge sat at the top of the grey block. That job moved to `BadgeStrip` on
the stats dashboard, which shows it on the page people actually open.

Locked badges are **always visible**, greyed, with their criterion spelled out.
That is the whole engagement mechanic — an empty shelf is exactly the problem
issue #35 opens by naming.

Icons come from `@tabler/icons-react`, already bundled.

## `src/components/BadgeStrip.jsx`

Two recent unlocks plus the single closest locked badge, as a three-up grid on
the stats dashboard linking to `/badges`. This is the page's advert: you see
"2,600 km from Once around" on the dashboard you already open, and you click.

At most one badge per category, so "To the Moon" and "To the Moon and back"
cannot sit side by side saying the same thing twice. Three items keeps the card
to one row and stops it pushing the charts below out of view.

Empty account: render nothing rather than a row of grey placeholders —
`FlightsStats` already has a `no_flights` path for that state.

## Nav

Sixth item for a logged-in user, after Timeline. Watch the mobile header at six
items; if it crowds, the strip is doing the discovery work anyway and the nav
item is the part that gives.

## Not doing

Recorded so the same ground is not re-covered.

**Notifications on unlock.** Considered and dropped. The badges are already on
the stats page and on their own page, so a toast adds a mechanism — a
`seenBadges` set in `localStorage`, or a before/after diff on flight creation —
for no information the user does not already get. Dropping it is what keeps the
feature at zero persisted state. If it ever comes back, the `localStorage`
seen-set is the correct mechanism, not the diff-on-add: a badge can unlock with
no user action at all, simply because an upcoming flight's date passed.

**Persisting unlocks to Firestore.** Unnecessary. Replaying sorted flights gives
a deterministic unlock date with no write path to get wrong.

**Continents visited.** The only idea from #35 that is not free — nothing maps a
country code to a continent, so it needs a ~250-entry table. Wanted later;
tracked in its own issue. When it lands, hand-write the map rather than adding a
dependency for one static object.

**A "ten laps of the Earth" badge (400,750 km).** Proposed and dropped: it sits
only 4% above `to_the_moon`, so it would have unlocked on nearly the same flight
and taught the reader nothing. `million_club` is the next distance step instead.

**A scannable QR code on the boarding pass.** The barcode is decorative, drawn
with a CSS gradient seeded from the badge id so no two badges match. A real QR
needs a library and somewhere worth pointing it; tracked separately.

**A Mars badge.** Discussed as a deliberately unreachable trophy. Dropped: even
at closest approach (54.6M km) the progress bar sits near zero forever and reads
as broken rather than aspirational. `there_and_back` at 768,800 km is the
long-horizon badge instead.

**Tiered badges that level up** (one "Distance" badge going Bronze→Gold). Flat
tiers instead: more filled squares is the reward, and a levelling badge gives a
long-haul flyer *fewer* visible achievements than a beginner.

**Year-in-review card (#34) as originally written.** The comparisons it was
built around — "4.5× around Earth", "% to the Moon" — already ship on
`DistanceStatsCard`. What remains that the stats page cannot do is the
swipe-through reveal, which is now what #34 tracks.
