# Flight details modal redesign — design

Date: 2026-09-19
Status: approved by Federico, not yet implemented — resume from here.
Builds on: #64 (flight status checker, merged into this branch's history).
Related follow-up (separate, low priority, not blocking): #65 (auto-check on
flight import).

## Problem

After shipping #64, the interaction felt wrong: status-checking lives behind
a ⋮ menu item ("View details"), separate from the existing Edit/Delete menu
items, and the details modal shows *only* API data — nothing about the
flight the user already entered. A flight that's never been checked shows an
almost-empty modal with no context.

## Decisions made during brainstorming

- **Trigger:** clicking a flight table row opens one modal for that flight —
  replaces the ⋮ action menu entirely.
- **⋮ menu (`FlightActions.jsx`) and the table's "Edit" column are removed.**
  Nothing else in the codebase uses `FlightActions` — confirm this still
  holds before deleting it.
- **Modal shows full flight info first**, not just API data: reuse what
  `FlightCard` already renders (route, airline + flight number, date/time,
  duration, distance, country badges, aircraft type) rather than rewriting
  it — compose `<FlightCard>` inside the modal, or extract its internals
  into a shared piece if the `title` prop doesn't fit cleanly. That's an
  implementation-time call, not a design one.
- **Live status shown separately below**, visually distinct (divider/own
  heading) — what `FlightDetailsPanel` renders today, expanded with:
  - check-in desk (`departure.checkInDesk` — confirmed present in real
    AeroDataBox responses, see #64's spec doc)
  - full airport name / city for departure and arrival
    (`departure.airport.name`/`.municipalityName`, same for arrival)
  - explicitly **not** added: the `quality` flag ("Basic"/"Live") or
    codeshare status — jargon, not useful to a casual user
  - "Last checked: <timestamp>" stays as the freshness signal. No diff/
    history view (e.g. "delay: 12min → 25min") — explicitly decided against
    as more complexity than this feature needs; the timestamp is judged
    sufficient.
- **Actions row inside the modal:** Edit / Check status / Delete, together.
  - Edit → opens the existing `FlightEntryForm` in a second modal on top,
    unchanged from today's behavior.
  - Check status → unchanged (`checkFlightStatus`, cooldown-gated, per #64).
  - Delete → the existing confirm-dialog pattern currently in
    `FlightActions.jsx`, relocated into the new modal.
- **No data model changes.** Everything needed (`flight_status`,
  `flight_status_checked_at`) already exists from #64.

## Files likely touched (confirm at planning time, not decided here)

- `src/components/FlightsList.tsx` — row becomes clickable, table drops to 3
  columns (Icon, From→To, Date/Duration/Distance), single modal/state
  replaces the current separate edit-modal and details-modal state.
- `src/components/FlightDetailsPanel.tsx` — expand to include the full-info
  section (composed from `FlightCard` or a shared extraction), the two new
  status fields (check-in desk, full airport names), and the Edit/Delete
  actions moved in from `FlightActions.jsx`.
- `src/components/FlightActions.jsx` + `FlightActions.d.ts` — likely deleted
  entirely; verify no other caller first.
- `src/components/FlightCard.tsx` — possibly refactored if its internals
  need extracting for reuse (only if composing `<FlightCard>` directly
  inside the modal doesn't work cleanly, e.g. because of the required
  `title` prop).
- Locale files (`public/locales/en|it/flights.json`) — new keys for
  check-in desk and airport name labels; existing `actions.view_details`
  key likely removable once the ⋮ menu is gone.

## Explicitly out of scope

- Anything from #65 (auto-check on import) — separate issue, not part of
  this redesign.
- A diff/history view of status changes over time.
- Any change to the AeroDataBox proxy function, cooldown rule, or client
  fetch service from #64 — this redesign only touches presentation and
  where the actions live.

## Next step when resuming

This was approved in chat but **not yet turned into an implementation
plan**. Resume by re-confirming this doc still reflects intent, then follow
the normal brainstorming → writing-plans → (subagent-driven-development or
executing-plans) flow used for #64.
