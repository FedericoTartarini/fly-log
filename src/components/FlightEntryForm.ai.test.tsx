/**
 * Integration tests for the AI → FlightEntryForm flow.
 *
 * Covers:
 * - The "✨ AI Chat" tab renders FlightChatInput
 * - handleAiParsed pre-fills form fields when onParsed fires
 * - "Go to Manual Entry" (onConfirm) switches the active tab to "Manual Entry"
 * - Return flight: setAddReturn(true) is triggered and return date is populated
 * - The form still renders correctly when no AI result is provided
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import userEvent from "@testing-library/user-event";

// ── Mock heavy dependencies ──────────────────────────────────────────────────

vi.mock("../utils/referenceData", () => ({
  loadAirportsInfo: vi.fn().mockResolvedValue([]),
  loadAirlinesInfo: vi.fn().mockResolvedValue([]),
}));

vi.mock("../firebaseClient", () => ({
  addFlightForUser: vi.fn().mockResolvedValue(undefined),
  addFlightsForUser: vi.fn().mockResolvedValue(undefined),
  auth: null,
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { uid: "test-uid" } }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

// ── Mock the AI parser so we control what it returns ─────────────────────────
const mockParseFlightFromText = vi.fn();

vi.mock("../utils/flightAiParser", () => ({
  parseFlightFromText: (...args: unknown[]) => mockParseFlightFromText(...args),
  REQUIRED_FIELDS: [
    "departure_airport_iata",
    "arrival_airport_iata",
    "departure_date",
    "airline_iata",
  ],
}));

import FlightEntryForm from "./FlightEntryForm";
import { FLIGHT_ENTRY_TABS } from "../constants/tabs";
import { loadAirportsInfo, loadAirlinesInfo } from "../utils/referenceData";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const fullParsed = {
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  departure_date: "2026-07-10",
  departure_time: "09:00",
  airline_iata: "QF",
  flight_number: "123",
  return_date: null,
  return_time: null,
  return_flight_number: null,
};

const returnParsed = {
  ...fullParsed,
  return_date: "2026-07-20",
  return_time: "14:30",
  return_flight_number: "456",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

/** Build a case-insensitive RegExp from a tab constant value for use in role queries. */
const tabName = (tab: string) => new RegExp(tab, "i");

describe("FlightEntryForm – AI tab integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAirportsInfo).mockResolvedValue([
      {
        iata: "SYD",
        airport_name: "Sydney Airport",
        city: "Sydney",
        country: "Australia",
        lat: -33.9399,
        lon: 151.1753,
        iso_country: "AU",
        iso_region: "AU-NSW",
        elevation: 21,
      },
      {
        iata: "SIN",
        airport_name: "Changi Airport",
        city: "Singapore",
        country: "Singapore",
        lat: 1.3644,
        lon: 103.9915,
        iso_country: "SG",
        iso_region: "SG-01",
        elevation: 7,
      },
    ]);
    vi.mocked(loadAirlinesInfo).mockResolvedValue([
      { iata: "QF", name: "Qantas", icao: "QFA" },
    ]);
  });

  /** Find the AI chat textarea (only present when the AI tab is active) */
  const getAiTextarea = () =>
    screen.getByRole("textbox") as HTMLTextAreaElement;

  // ── Tab visibility ───────────────────────────────────────────────────────

  it("renders all three tabs: Manual Entry, AI Chat, and CSV Upload", () => {
    render(<FlightEntryForm />);

    expect(
      screen.getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.MANUAL) }),
    ).not.toBeNull();
    expect(
      screen.getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.AI) }),
    ).not.toBeNull();
    expect(
      screen.getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.CSV) }),
    ).not.toBeNull();
  });

  it("shows Manual Entry panel by default", () => {
    render(<FlightEntryForm />);

    expect(screen.getByLabelText(/departure date/i)).not.toBeNull();
  });

  it("switching to AI Chat tab shows the FlightChatInput textarea", async () => {
    render(<FlightEntryForm />);

    await userEvent.click(
      screen.getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.AI) }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /parse with ai/i }),
      ).not.toBeNull();
    });
  });

  // ── AI parse → form pre-fill ─────────────────────────────────────────────

  it("pre-fills the form and switches to Manual Entry after confirming", async () => {
    mockParseFlightFromText.mockResolvedValue(fullParsed);
    render(<FlightEntryForm />);

    await userEvent.click(
      screen.getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.AI) }),
    );
    await waitFor(() => screen.getByRole("button", { name: /parse with ai/i }));

    await userEvent.type(getAiTextarea(), "SYD to SIN on 10 July with Qantas");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() =>
      screen.getByRole("button", { name: /go to manual entry/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /go to manual entry/i }),
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.MANUAL) })
          .getAttribute("aria-selected"),
      ).toBe("true");
    });
    // Verify that parsed AI values populated the manual form inputs
    const departureAirport = screen.getAllByLabelText(
      /^departure airport/i,
    )[0] as HTMLInputElement;
    const arrivalAirport = screen.getAllByLabelText(
      /^arrival airport/i,
    )[0] as HTMLInputElement;
    const airline = screen.getAllByLabelText(
      /^airline/i,
    )[0] as HTMLInputElement;
    const departureTime = screen.getByLabelText(
      /departure time/i,
    ) as HTMLInputElement;

    expect(departureAirport.disabled).toBe(false);
    expect(arrivalAirport.disabled).toBe(false);
    expect(airline.disabled).toBe(false);
    expect(departureAirport.value).toMatch(/SYD/i);
    expect(arrivalAirport.value).toMatch(/SIN/i);
    expect(airline.value).toMatch(/QF/i);
    expect(departureTime.value).toMatch(/09:00/);
  });

  // ── onConfirm switches tab ────────────────────────────────────────────────

  it("'Go to Manual Entry' makes the Manual Entry tab active", async () => {
    mockParseFlightFromText.mockResolvedValue(fullParsed);
    render(<FlightEntryForm />);

    await userEvent.click(
      screen.getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.AI) }),
    );
    await waitFor(() => screen.getByRole("button", { name: /parse with ai/i }));

    await userEvent.type(getAiTextarea(), "any text");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );
    await waitFor(() =>
      screen.getByRole("button", { name: /go to manual entry/i }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /go to manual entry/i }),
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.MANUAL) })
          .getAttribute("aria-selected"),
      ).toBe("true");
    });
  });

  // ── Return flight flow ────────────────────────────────────────────────────

  it("enables the return flight section when AI extracts a return date", async () => {
    mockParseFlightFromText.mockResolvedValue(returnParsed);
    render(<FlightEntryForm />);

    await userEvent.click(
      screen.getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.AI) }),
    );
    await waitFor(() => screen.getByRole("button", { name: /parse with ai/i }));

    await userEvent.type(getAiTextarea(), "SYD to SIN, returning 20 July");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() =>
      screen.getByRole("button", { name: /go to manual entry/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /go to manual entry/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /return flight/i }),
      ).not.toBeNull();
    });
  });

  // ── Edit mode hides tabs ──────────────────────────────────────────────────

  it("does not render tabs when in editing mode (flight prop provided)", () => {
    const existingFlight = {
      id: "abc123",
      departure_date: "2026-07-10",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "SIN",
      airline_iata: "QF",
      flight_number: "123",
    };

    render(<FlightEntryForm flight={existingFlight} />);

    expect(
      screen.queryByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.AI) }),
    ).toBeNull();
    expect(
      screen.queryByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.CSV) }),
    ).toBeNull();
    expect(screen.getByLabelText(/departure date/i)).not.toBeNull();
  });
});
