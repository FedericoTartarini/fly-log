# Flight Details Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a flight table row opens one modal showing the flight's full logged info, its live status (if any), and three actions — Edit, Check status, Delete — replacing the current ⋮ menu.

**Architecture:** `FlightsList.tsx` keeps its existing modal-open/close state, but the row itself becomes the trigger (the ⋮ menu and its `FlightActions` component are deleted). A new `FlightDetailsModal.tsx` composes the existing `FlightCard` (flight info) with a slimmed-down `FlightDetailsPanel` (live status only) and a bottom action row that owns the check-status/cooldown logic (moved from `FlightDetailsPanel`) plus Edit and Delete (moved from `FlightActions`).

**Tech Stack:** React 19 + TypeScript, Mantine UI, Firestore (via `flightService`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-19-flight-details-modal-redesign-design.md` (issue #66)

## Global Constraints

- No data model changes — `flight_status` / `flight_status_checked_at` already exist.
- Do not touch the AeroDataBox proxy function, the cooldown rule, or the client fetch service (`flightStatusService.ts`, `flightStatusCooldown.ts`) — this is presentation only.
- Preserve the `flight-status-check-{id}` `data-testid` exactly — it identifies the check-status button across this refactor.
- Explicitly do not add: the `quality` flag ("Basic"/"Live"), codeshare status, or a status diff/history view.
- Every new/changed user-facing string needs both `public/locales/en/flights.json` and `public/locales/it/flights.json` entries.

---

### Task 1: Slim `FlightDetailsPanel` to a pure status display, add check-in desk + airport names

**Files:**
- Modify: `src/components/FlightDetailsPanel.tsx` (full rewrite — see below)
- Modify: `src/components/FlightDetailsPanel.test.tsx` (full rewrite — see below)
- Modify: `public/locales/en/flights.json`
- Modify: `public/locales/it/flights.json`

**Interfaces:**
- Produces: `FlightDetailsPanel: React.FC<{ flight: enhancedFlight }>` — renders status only, no button, no auth/network dependency. Task 2 composes this directly.

- [ ] **Step 1: Add the new locale keys**

In `public/locales/en/flights.json`, inside the `"status"` object, add these three keys (keep existing keys as-is):

```json
    "check_in_desk": "Check-in desk: {{value}}",
    "departure_airport": "Departing from {{value}}",
    "arrival_airport": "Arriving at {{value}}",
```

In `public/locales/it/flights.json`, inside the `"status"` object, add:

```json
    "check_in_desk": "Banco check-in: {{value}}",
    "departure_airport": "Partenza da {{value}}",
    "arrival_airport": "Arrivo a {{value}}",
```

- [ ] **Step 2: Write the failing test**

Replace the entire contents of `src/components/FlightDetailsPanel.test.tsx` with:

```tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../test-utils";
import FlightDetailsPanel from "./FlightDetailsPanel";
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

describe("FlightDetailsPanel", () => {
  it("shows a placeholder message when no status has been checked", () => {
    render(<FlightDetailsPanel flight={baseFlight} />);
    expect(
      screen.getByText("No live status checked yet."),
    ).toBeInTheDocument();
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
    // Regression: i18next's default HTML-escaping turns "/" into "&#x2F;" in
    // interpolated values. The checked-at timestamp is a locale-formatted
    // date (e.g. "20/09/2026, ...") rendered as plain React text, not HTML,
    // so it must never contain the escaped entity.
    expect(document.body.textContent).not.toContain("&#x2F;");
  });

  it("renders check-in desk and full airport names when present", () => {
    render(
      <FlightDetailsPanel
        flight={{
          ...baseFlight,
          flight_status: {
            status: "Expected",
            departure: {
              checkInDesk: "12-18",
              airport: { name: "Sydney Airport", municipalityName: "Sydney" },
            },
            arrival: {
              airport: {
                name: "Changi Airport",
                municipalityName: "Singapore",
              },
            },
          },
          flight_status_checked_at: "2026-09-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText(/Check-in desk: 12-18/)).toBeInTheDocument();
    expect(screen.getByText(/Sydney Airport, Sydney/)).toBeInTheDocument();
    expect(
      screen.getByText(/Changi Airport, Singapore/),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/FlightDetailsPanel.test.tsx`
Expected: FAIL — the current component still renders a "Check status" button and doesn't know about `checkInDesk`/`airport`, so the new assertions won't match and the old button-related behavior is gone from this test file (existing exports still compile, but the new text isn't rendered yet).

- [ ] **Step 4: Replace `FlightDetailsPanel.tsx`**

Replace the entire contents of `src/components/FlightDetailsPanel.tsx` with:

```tsx
import React from "react";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { enhancedFlight } from "../types/enhancedFlight";

interface FlightDetailsPanelProps {
  flight: enhancedFlight;
}

type FlightLegTime = {
  scheduledTime?: { utc?: string };
  revisedTime?: { utc?: string };
  terminal?: string;
  gate?: string;
  checkInDesk?: string;
  airport?: { name?: string; municipalityName?: string };
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

const formatAirport = (leg: FlightLegTime | undefined): string | null => {
  const name = leg?.airport?.name;
  const city = leg?.airport?.municipalityName;
  if (name && city) return `${name}, ${city}`;
  return name ?? city ?? null;
};

const FlightDetailsPanel: React.FC<FlightDetailsPanelProps> = ({
  flight,
}) => {
  const { t } = useTranslation(["flights"]);
  const statusData = flight.flight_status as FlightLeg | null | undefined;

  if (!statusData) {
    return (
      <Text size="sm" c="dimmed">
        {t("status.no_data")}
      </Text>
    );
  }

  const departureDelay = getDelayMinutes(statusData.departure);
  const arrivalDelay = getDelayMinutes(statusData.arrival);
  const departureAirport = formatAirport(statusData.departure);
  const arrivalAirport = formatAirport(statusData.arrival);

  return (
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
      {departureAirport && (
        <Text size="sm">
          {t("status.departure_airport", { value: departureAirport })}
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
      {statusData.departure?.checkInDesk && (
        <Text size="sm">
          {t("status.check_in_desk", {
            value: statusData.departure.checkInDesk,
          })}
        </Text>
      )}
      {arrivalAirport && (
        <Text size="sm">
          {t("status.arrival_airport", { value: arrivalAirport })}
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
            value: new Date(
              flight.flight_status_checked_at,
            ).toLocaleString(),
            interpolation: { escapeValue: false },
          })}
        </Text>
      )}
    </Stack>
  );
};

export default FlightDetailsPanel;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/FlightDetailsPanel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/FlightDetailsPanel.tsx src/components/FlightDetailsPanel.test.tsx public/locales/en/flights.json public/locales/it/flights.json
git commit -m "refactor: slim FlightDetailsPanel to a pure status display

Adds check-in desk and full airport name/city rendering. The
check-status button and its cooldown/network logic move to the new
FlightDetailsModal in the next commit."
```

---

### Task 2: Create `FlightDetailsModal` (FlightCard + status + Edit/Check status/Delete)

**Files:**
- Create: `src/components/FlightDetailsModal.tsx`
- Create: `src/components/FlightDetailsModal.test.tsx`

**Interfaces:**
- Consumes: `FlightCard: React.FC<{ flight: enhancedFlight; title: string }>` (`./FlightCard`, unchanged), `FlightDetailsPanel: React.FC<{ flight: enhancedFlight }>` (`./FlightDetailsPanel`, from Task 1), `deleteFlightForUser(uid: string, flightId: string): Promise<void>` (`../utils/flightService`), `getFlightStatusCooldown(flight: enhancedFlight): { allowed: boolean; nextCheckAt: Date | null }` (`../utils/flightStatusCooldown`), `checkFlightStatus(uid: string, flight: enhancedFlight): Promise<unknown>` and `FlightStatusError` (`../utils/flightStatusService`), `useAuth(): { user: { uid: string } | null }` (`../context/AuthContext`).
- Produces: `FlightDetailsModal: React.FC<{ flight: enhancedFlight; onEdit: (flight: enhancedFlight) => void }>` (default export) — Task 3 renders this from `FlightsList`.

- [ ] **Step 1: Write the failing test**

Create `src/components/FlightDetailsModal.test.tsx`:

```tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "../../test-utils";
import FlightDetailsModal from "./FlightDetailsModal";
import type { enhancedFlight } from "../types/enhancedFlight";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "uid-1" } }),
}));

const checkFlightStatusMock = vi.fn();
// FlightStatusError is re-exported unmocked: the component uses it in an
// `instanceof` check to pick the user-facing message, so the class the test
// throws must be the same one the component imports.
vi.mock("../utils/flightStatusService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../utils/flightStatusService")>();
  return {
    FlightStatusError: actual.FlightStatusError,
    checkFlightStatus: (...args: unknown[]) => checkFlightStatusMock(...args),
  };
});

const deleteFlightForUserMock = vi.fn();
vi.mock("../utils/flightService", () => ({
  deleteFlightForUser: (...args: unknown[]) =>
    deleteFlightForUserMock(...args),
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

describe("FlightDetailsModal", () => {
  beforeEach(() => {
    checkFlightStatusMock.mockReset();
    deleteFlightForUserMock.mockReset();
  });

  it("renders the flight's route and flight number", () => {
    render(<FlightDetailsModal flight={baseFlight} onEdit={vi.fn()} />);
    expect(screen.getByText("SYD → SIN")).toBeInTheDocument();
    expect(screen.getByText("QF1")).toBeInTheDocument();
  });

  it("calls onEdit with the flight when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(<FlightDetailsModal flight={baseFlight} onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId("flight-details-edit-1"));
    expect(onEdit).toHaveBeenCalledWith(baseFlight);
  });

  it("checks flight status when Check status is clicked", async () => {
    checkFlightStatusMock.mockResolvedValue({ status: "Expected" });
    render(<FlightDetailsModal flight={baseFlight} onEdit={vi.fn()} />);

    const button = screen.getByTestId("flight-status-check-1");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(checkFlightStatusMock).toHaveBeenCalledWith("uid-1", baseFlight),
    );
  });

  it("disables the check button while the cooldown is in effect", () => {
    render(
      <FlightDetailsModal
        flight={{
          ...baseFlight,
          flight_status: { status: "Expected" },
          flight_status_checked_at: new Date().toISOString(),
        }}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("flight-status-check-1")).toBeDisabled();
  });

  it("shows a message instead of the check button when there's no flight number", () => {
    render(
      <FlightDetailsModal
        flight={{ ...baseFlight, flight_number: null }}
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("flight-status-check-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "This flight has no flight number, so status can't be looked up.",
      ),
    ).toBeInTheDocument();
  });

  it("deletes the flight after confirming", async () => {
    deleteFlightForUserMock.mockResolvedValue(undefined);
    render(<FlightDetailsModal flight={baseFlight} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("flight-details-delete-1"));
    fireEvent.click(await screen.findByTestId("flight-delete-confirm-1"));

    await waitFor(() =>
      expect(deleteFlightForUserMock).toHaveBeenCalledWith("uid-1", "1"),
    );
  });

  it("does not delete when the confirm dialog is cancelled", () => {
    render(<FlightDetailsModal flight={baseFlight} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("flight-details-delete-1"));
    fireEvent.click(screen.getByTestId("flight-delete-cancel-1"));

    expect(deleteFlightForUserMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/FlightDetailsModal.test.tsx`
Expected: FAIL with "Failed to resolve import './FlightDetailsModal'" (file doesn't exist yet).

- [ ] **Step 3: Create `FlightDetailsModal.tsx`**

Create `src/components/FlightDetailsModal.tsx`:

```tsx
import React, { useEffect, useReducer, useState } from "react";
import {
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../context/AuthContext";
import type { enhancedFlight } from "../types/enhancedFlight";
import FlightCard from "./FlightCard";
import FlightDetailsPanel from "./FlightDetailsPanel";
import { deleteFlightForUser } from "../utils/flightService";
import { getFlightStatusCooldown } from "../utils/flightStatusCooldown";
import {
  checkFlightStatus,
  FlightStatusError,
} from "../utils/flightStatusService";

interface FlightDetailsModalProps {
  flight: enhancedFlight;
  onEdit: (flight: enhancedFlight) => void;
}

const FlightDetailsModal: React.FC<FlightDetailsModalProps> = ({
  flight,
  onEdit,
}) => {
  const { t } = useTranslation(["flights"]);
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [, recheckCooldown] = useReducer((n: number) => n + 1, 0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const cooldown = getFlightStatusCooldown(flight);
  const hasFlightNumber = Boolean(flight.flight_number);

  // The cooldown is evaluated against `new Date()` at render time, so without
  // this the button stays disabled after the cooldown expires until something
  // else re-renders the modal. Re-render once, when it actually elapses.
  const nextCheckMs = cooldown.nextCheckAt?.getTime() ?? null;
  useEffect(() => {
    if (nextCheckMs === null) return;
    const delay = nextCheckMs - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(recheckCooldown, delay);
    return () => clearTimeout(timer);
  }, [nextCheckMs]);

  // 404 and 429 are the two failures a user can act on, so they get their own
  // wording; everything else would only expose an internal English string.
  const errorMessage = (err: unknown): string => {
    if (err instanceof FlightStatusError) {
      if (err.status === 404) return t("status.error_not_found");
      if (err.status === 429) return t("status.error_quota");
      if (err.status === 401) return t("status.error_unauthorized");
    }
    return t("status.error_generic");
  };

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
      // Keep the technical detail where a developer can find it; the user
      // gets the translated summary.
      console.error("Flight status check failed", err);
      notifications.show({
        title: t("status.check_error_title"),
        message: errorMessage(err),
        color: "red",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.uid) {
      notifications.show({
        title: t("actions.not_signed_in"),
        message: "",
        color: "red",
      });
      return;
    }
    setIsDeleting(true);
    try {
      // The Firestore listener removes the flight (and FlightsList closes
      // this modal once the flight disappears from the list) as soon as the
      // local write lands.
      await deleteFlightForUser(user.uid, flight.id);
      notifications.show({
        title: t("actions.deleted_title"),
        message: t("actions.deleted_message"),
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: t("actions.delete_error_title"),
        message: (err && (err as Error).message) || String(err),
        color: "red",
      });
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  const checkButtonDisabled = !cooldown.allowed || isChecking;
  const flightNumberLabel = flight.flight_number
    ? `${flight.airline_iata ?? ""}${flight.flight_number}`
    : (flight.airline_name ?? "");

  return (
    <Stack gap="md">
      <FlightCard flight={flight} title={flightNumberLabel} />

      <Divider />

      <FlightDetailsPanel flight={flight} />

      <Divider />

      <Group justify="flex-end">
        <Button
          variant="default"
          leftSection={<IconPencil size={14} />}
          onClick={() => onEdit(flight)}
          data-testid={`flight-details-edit-${flight.id}`}
        >
          {t("actions.edit")}
        </Button>

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
                    interpolation: { escapeValue: false },
                  })
                : t("status.no_further_checks")
            }
          >
            <span>
              <Button
                onClick={handleCheck}
                loading={isChecking}
                disabled={checkButtonDisabled}
                style={
                  checkButtonDisabled ? { pointerEvents: "none" } : undefined
                }
                data-testid={`flight-status-check-${flight.id}`}
              >
                {t("status.check_button")}
              </Button>
            </span>
          </Tooltip>
        )}

        <Button
          color="red"
          variant="light"
          leftSection={<IconTrash size={14} />}
          onClick={() => setConfirmOpen(true)}
          data-testid={`flight-details-delete-${flight.id}`}
        >
          {t("actions.delete")}
        </Button>
      </Group>

      <Modal
        opened={confirmOpen}
        onClose={() => !isDeleting && setConfirmOpen(false)}
        closeOnClickOutside={!isDeleting}
        closeOnEscape={!isDeleting}
        withCloseButton={!isDeleting}
        title={t("actions.confirm_delete_title")}
        centered
      >
        <Text>{t("actions.confirm_delete_message")}</Text>
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => !isDeleting && setConfirmOpen(false)}
            disabled={isDeleting}
            data-testid={`flight-delete-cancel-${flight.id}`}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            loading={isDeleting}
            data-testid={`flight-delete-confirm-${flight.id}`}
          >
            {t("actions.delete")}
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
};

export default FlightDetailsModal;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/FlightDetailsModal.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/FlightDetailsModal.tsx src/components/FlightDetailsModal.test.tsx
git commit -m "feat: add FlightDetailsModal composing flight info, status, and actions

Composes FlightCard + the slimmed FlightDetailsPanel with a bottom
action row (Edit / Check status / Delete). Check-status cooldown logic
moves here from FlightDetailsPanel; delete's confirm-dialog pattern
moves here from FlightActions."
```

---

### Task 3: Wire `FlightsList` — clickable rows, remove the ⋮ menu

**Files:**
- Modify: `src/components/FlightsList.tsx` (full rewrite — see below)
- Modify: `src/components/FlightsList.test.tsx`
- Modify: `public/locales/en/flights.json`
- Modify: `public/locales/it/flights.json`

**Interfaces:**
- Consumes: `FlightDetailsModal: React.FC<{ flight: enhancedFlight; onEdit: (flight: enhancedFlight) => void }>` (`./FlightDetailsModal`, from Task 2).

- [ ] **Step 1: Add the row aria-label locale key**

In `public/locales/en/flights.json`, inside the `"table"` object, add:

```json
    "view_row_details": "View flight details: {{from}} to {{to}}",
```

Remove the now-unused `"actions": "Edit"` key from the same `"table"` object (the Actions column is gone).

In `public/locales/it/flights.json`, inside the `"table"` object, add:

```json
    "view_row_details": "Visualizza dettagli volo: {{from}} verso {{to}}",
```

Remove the now-unused `"actions": "Modifica"` key from the same `"table"` object.

- [ ] **Step 2: Write the failing test**

In `src/components/FlightsList.test.tsx`, add `fireEvent` to the existing `@testing-library/react` import:

```tsx
import { screen, fireEvent } from "@testing-library/react";
```

Then add this test inside the `describe("FlightsList", ...)` block, after the existing two tests:

```tsx
  it("opens the flight details modal when a row is clicked", async () => {
    const mockedUseFlightStore = useFlightStore as unknown as Mock;
    mockedUseFlightStore.mockImplementation(
      (selector: (state: StoreShape) => unknown) =>
        selector({
          filteredFlights: [enrichedFlight],
        }),
    );

    render(<FlightsList />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });

    fireEvent.click(screen.getByTestId("flight-row-1"));

    expect(
      await screen.findByTestId("flight-details-edit-1"),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/FlightsList.test.tsx`
Expected: FAIL — no element with `data-testid="flight-row-1"` exists yet.

- [ ] **Step 4: Replace `FlightsList.tsx`**

Replace the entire contents of `src/components/FlightsList.tsx` with:

```tsx
import React, { lazy, Suspense } from "react";
import {
  Image,
  Table,
  Text,
  ActionIcon,
  Center,
  Modal,
  Pagination,
  Loader,
  Stack,
} from "@mantine/core";
import { IconPlaneInflight } from "@tabler/icons-react";
import useFlightStore from "../store";
import type { enhancedFlight } from "../types/enhancedFlight";
import { formatCalendarDate, parseToDate } from "../utils/dateUtils";
import { useTranslation } from "react-i18next";
import type { FlightStoreState } from "../store";

const FlightEntryForm = lazy(() => import("./FlightEntryForm"));
const FlightDetailsModal = lazy(() => import("./FlightDetailsModal"));

/**
 * Renders a paginated list of flights in a table.
 */
const FlightsList: React.FC = () => {
  const filteredFlights = useFlightStore(
    (s: FlightStoreState) => s.filteredFlights as enhancedFlight[],
  );

  const { t } = useTranslation("flights");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editFlight, setEditFlight] = React.useState<enhancedFlight | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsFlightId, setDetailsFlightId] = React.useState<string | null>(
    null,
  );
  // Derived from the live list, not snapshotted, so a status write lands in
  // the open modal. The flip side is that the flight can vanish underneath it
  // (deleted, or filtered out), which would leave an empty titled modal open.
  const detailsFlight =
    filteredFlights.find((f) => f.id === detailsFlightId) ?? null;
  React.useEffect(() => {
    if (detailsOpen && detailsFlightId !== null && detailsFlight === null) {
      setDetailsOpen(false);
    }
  }, [detailsOpen, detailsFlightId, detailsFlight]);

  const PAGE_SIZE = 20;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredFlights.length / PAGE_SIZE));

  // reset to first page if filteredFlights changes (e.g., new fetch or filter applied)
  const filterKey = React.useMemo(
    () => JSON.stringify(filteredFlights.map((f) => f.id).sort()),
    [filteredFlights],
  );
  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const [failedImages, setFailedImages] = React.useState(new Set<string>());

  const hasResults = filteredFlights.length > 0;

  // Helper to get epoch ms for various departure_date representations
  const getDepartureEpoch = (flight: enhancedFlight): number => {
    const dt = parseToDate(flight?.departure_date);
    if (!dt) return -Infinity;
    const t = dt.getTime();
    return isNaN(t) ? -Infinity : t;
  };

  // Sort flights by departure date descending (newest first)
  const sortedFlights = [...filteredFlights].sort(
    (a, b) => getDepartureEpoch(b) - getDepartureEpoch(a),
  );

  // compute the flights to show on the current page (after sorting)
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedFlights = sortedFlights.slice(startIndex, endIndex);

  const openDetails = (flight: enhancedFlight) => {
    setDetailsFlightId(flight.id);
    setDetailsOpen(true);
  };

  /**
   * Returns the airline icon or a fallback icon.
   * @param {enhancedFlight} flight
   * @returns {JSX.Element}
   */
  const getAirlineIcon = (flight: enhancedFlight): React.ReactElement => {
    if (failedImages.has(flight.id)) {
      return (
        <ActionIcon
          aria-label={`${flight.airline_name || flight.airline_iata || "Airline"} icon`}
          color="gray"
        >
          <IconPlaneInflight
            style={{ width: "70%", height: "70%" }}
            stroke={1.5}
          />
        </ActionIcon>
      );
    }

    const sourcePath = flight.airline_icon_path;

    if (!sourcePath) {
      return (
        <ActionIcon
          aria-label={`${flight.airline_name || flight.airline_iata || "Airline"} icon`}
          color="gray"
        >
          <IconPlaneInflight
            style={{ width: "70%", height: "70%" }}
            stroke={1.5}
          />
        </ActionIcon>
      );
    }

    const imageUrl = `/logos/${sourcePath}`;

    // Provide a safe fallback image using onError to swap src to the airlines_info icon, then to a generic default
    return (
      <Image
        src={imageUrl}
        alt={`${flight.airline_name ?? ""} icon`}
        h={50}
        w="auto"
        fit="contain"
        loading="lazy"
        p={4}
        onError={() => setFailedImages((prev) => new Set(prev).add(flight.id))}
      />
    );
  };

  return (
    <Stack gap="md">
      {!hasResults ? (
        <Text mt="md" ta="center">
          {t("no_flights")}
        </Text>
      ) : (
        <>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Center>{t("table.icon")}</Center>
                </Table.Th>
                <Table.Th>{t("table.from_to")}</Table.Th>
                <Table.Th>{t("table.date_duration_distance")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedFlights.map((flight) => {
                const departureDateStr = formatCalendarDate(
                  flight.departure_date,
                );

                // Safe formatting for flight time and distance
                const ft = flight.flight_time ?? null;
                const distValue =
                  typeof flight.distance_km === "number"
                    ? flight.distance_km
                    : null;
                const dist =
                  distValue !== null && Number.isFinite(distValue)
                    ? Math.round(distValue)
                    : null;
                let durationDistanceStr = "";
                if (ft !== null) {
                  let hours = Math.floor(ft);
                  let minutes = Math.round((ft % 1) * 60);
                  if (minutes === 60) {
                    hours += 1;
                    minutes = 0;
                  }
                  if (dist !== null) {
                    durationDistanceStr = `${hours}h ${minutes}m, ${dist.toLocaleString()} km`;
                  } else {
                    durationDistanceStr = `${hours}h ${minutes}m`;
                  }
                } else if (dist !== null) {
                  durationDistanceStr = `${dist.toLocaleString()} km`;
                }

                const rowLabel = t("table.view_row_details", {
                  from: flight.departure_airport_iata,
                  to: flight.arrival_airport_iata,
                });

                return (
                  <Table.Tr
                    key={flight.id}
                    onClick={() => openDetails(flight)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetails(flight);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={rowLabel}
                    style={{ cursor: "pointer" }}
                    data-testid={`flight-row-${flight.id}`}
                  >
                    <Table.Td p={"0.5rem"}>
                      <Center>{getAirlineIcon(flight)}</Center>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {flight.departure_airport_iata} →{" "}
                        {flight.arrival_airport_iata}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {flight.airline_iata || flight.airline_name}{" "}
                        {flight.flight_number
                          ? `: ${flight.flight_number}`
                          : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {departureDateStr}
                        {flight.departure_time
                          ? `, ${flight.departure_time}`
                          : ""}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {durationDistanceStr}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {/* Pagination control */}
          {totalPages > 1 && (
            <Center mt="md">
              <Pagination total={totalPages} value={page} onChange={setPage} />
            </Center>
          )}
        </>
      )}

      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("form.labels.edit_flight")}
      >
        {editFlight && (
          <Suspense fallback={<Loader size="sm" />}>
            <FlightEntryForm
              flight={editFlight}
              onSaved={() => setEditOpen(false)}
            />
          </Suspense>
        )}
      </Modal>

      <Modal
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={
          detailsFlight
            ? `${detailsFlight.departure_airport_iata} → ${detailsFlight.arrival_airport_iata}`
            : ""
        }
        size="lg"
      >
        {detailsFlight && (
          <Suspense fallback={<Loader size="sm" />}>
            <FlightDetailsModal
              flight={detailsFlight}
              onEdit={(f) => {
                setEditFlight(f);
                setEditOpen(true);
              }}
            />
          </Suspense>
        )}
      </Modal>
    </Stack>
  );
};

export default FlightsList;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/FlightsList.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/FlightsList.tsx src/components/FlightsList.test.tsx public/locales/en/flights.json public/locales/it/flights.json
git commit -m "feat: make flight table rows open the details modal on click

Replaces the per-row action menu trigger with a clickable, keyboard-
accessible row. The details modal now renders FlightDetailsModal
(flight info + status + actions) instead of just the status panel."
```

---

### Task 4: Delete `FlightActions` and its now-unused locale keys

**Files:**
- Delete: `src/components/FlightActions.jsx`
- Delete: `src/components/FlightActions.d.ts`
- Modify: `public/locales/en/flights.json`
- Modify: `public/locales/it/flights.json`

**Interfaces:**
- None — nothing else imports `FlightActions` after Task 3 (verify in Step 1).

- [ ] **Step 1: Confirm nothing still imports `FlightActions`**

Run: `grep -rn "FlightActions" --include="*.tsx" --include="*.jsx" --include="*.ts" src`
Expected: no output (Task 3 already removed the only import in `FlightsList.tsx`).

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/FlightActions.jsx src/components/FlightActions.d.ts
```

- [ ] **Step 3: Remove the now-unused locale keys**

In `public/locales/en/flights.json`, remove these two keys from the `"actions"` object (all other `actions.*` keys are still used by `FlightDetailsModal`):

```json
    "open_menu": "Open actions",
    "view_details": "View details",
```

In `public/locales/it/flights.json`, remove:

```json
    "open_menu": "Apri azioni",
    "view_details": "Visualizza dettagli",
```

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no failures. (No test imported `FlightActions` directly, since it was only reachable through `FlightsList`.)

- [ ] **Step 5: Commit**

```bash
git add -u src/components/FlightActions.jsx src/components/FlightActions.d.ts public/locales/en/flights.json public/locales/it/flights.json
git commit -m "chore: remove FlightActions, superseded by FlightDetailsModal

The ⋮ menu (view details / edit / delete) is fully replaced by the
clickable-row + details-modal flow from the previous two commits."
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, all tests green.

- [ ] **Step 2: Run lint**

Run: `npx eslint .`
Expected: no errors.

- [ ] **Step 3: Run the TypeScript check**

Run: `npx tsc --noEmit` (or the project's existing typecheck script if one exists — check `package.json` `"scripts"` first)
Expected: no errors.

- [ ] **Step 4: Manual smoke check in the dev server**

Start the dev server, open the Flights list, and confirm:
- Clicking a row (not a menu) opens the details modal.
- The modal shows the flight's route/airline/flight number/date/duration/distance/country badges (from `FlightCard`), then live status below (or "No live status checked yet."), then Edit / Check status / Delete buttons.
- Edit opens the existing edit form in a second modal, on top.
- Delete asks for confirmation, then removes the flight and closes the details modal.
- No ⋮ menu remains anywhere in the table.

- [ ] **Step 5: Commit if the smoke check needed any fixes**

Only if Step 4 uncovered an issue — otherwise nothing to commit here.
