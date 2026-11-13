/**
 * Tests for FlightChatInput component.
 *
 * Covers:
 * - Initial render (textarea, "What to include" note, fill-in button)
 * - Successful parse → one row per flight found, missing-fields warning
 * - "Review N flights" button calls onConfirm
 * - Editing the text clears the flights found
 * - Error state when parseFlightFromText rejects
 * - Ctrl+Enter keyboard shortcut triggers parse
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "../../test-utils";
import userEvent from "@testing-library/user-event";

// ─── Mock the AI parser ───────────────────────────────────────────────────────
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

import FlightChatInput from "./FlightChatInput";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const fullFlight = [
  {
    departure_airport_iata: "SYD",
    arrival_airport_iata: "SIN",
    departure_date: "2026-07-10",
    departure_time: "09:00",
    airline_iata: "QF",
    flight_number: "1",
  },
];

const multiLegFlight = [
  ...fullFlight,
  {
    departure_airport_iata: "SIN",
    arrival_airport_iata: "LHR",
    departure_date: null, // missing → warning prefixed with "Flight 2"
    departure_time: "14:30",
    airline_iata: "QF",
    flight_number: "2",
  },
];

const partialFlight = [
  {
    departure_airport_iata: "SYD",
    arrival_airport_iata: "SIN",
    departure_date: null, // missing
    departure_time: null,
    airline_iata: null, // missing
    flight_number: null,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FlightChatInput", () => {
  const onParsed = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(<FlightChatInput onParsed={onParsed} onConfirm={onConfirm} />);

  /** Grab the single textarea regardless of placeholder text */
  const getTextarea = () => screen.getByRole("textbox") as HTMLTextAreaElement;

  // ── Initial render ──────────────────────────────────────────────────────────

  it("renders the textarea, fill-in button, and what to include", () => {
    renderComponent();

    expect(getTextarea()).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /fill in the flights/i }),
    ).not.toBeNull();
    expect(screen.getByText(/what to include/i)).not.toBeNull();
  });

  it("parse button is disabled when textarea is empty", () => {
    renderComponent();
    expect(
      screen
        .getByRole("button", { name: /fill in the flights/i })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("parse button is enabled after typing in the textarea", async () => {
    renderComponent();
    await userEvent.type(getTextarea(), "SYD to SIN");
    expect(
      screen
        .getByRole("button", { name: /fill in the flights/i })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  // ── Successful full parse ───────────────────────────────────────────────────

  it("shows one row per flight found after a successful parse", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "SYD to SIN on 10 July with Qantas");
    await userEvent.click(
      screen.getByRole("button", { name: /fill in the flights/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/we found 1 flight/i)).not.toBeNull();
    });

    const row = screen.getByRole("listitem");
    expect(row.textContent).toContain("SYD→SIN");
    expect(row.textContent).toContain("10 Jul 2026");
    expect(row.textContent).toContain("Qantas");
    expect(onParsed).toHaveBeenCalledWith(fullFlight);
  });

  it("shows the 'Review 1 flight' button after a successful parse", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "any text");
    await userEvent.click(
      screen.getByRole("button", { name: /fill in the flights/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /review 1 flight/i }),
      ).not.toBeNull();
    });
  });

  it("calls onConfirm when 'Review 1 flight' is clicked", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "any text");
    await userEvent.click(
      screen.getByRole("button", { name: /fill in the flights/i }),
    );

    await waitFor(() =>
      screen.getByRole("button", { name: /review 1 flight/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /review 1 flight/i }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  // ── Missing fields warning ──────────────────────────────────────────────────

  it("shows a missing-fields warning when required fields are null", async () => {
    mockParseFlightFromText.mockResolvedValue(partialFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "vague description");
    await userEvent.click(
      screen.getByRole("button", { name: /fill in the flights/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/some details are missing/i)).not.toBeNull();
    });

    expect(screen.getByText(/Date/)).not.toBeNull();
    expect(screen.getByText(/Airline/)).not.toBeNull();
  });

  it("does NOT show missing-fields warning when all required fields are present", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "full details");
    await userEvent.click(
      screen.getByRole("button", { name: /fill in the flights/i }),
    );

    await waitFor(() => screen.getByText(/we found 1 flight/i));

    expect(screen.queryByText(/some details are missing/i)).toBeNull();
  });

  // ── Multi-leg trips ────────────────────────────────────────────────────────

  it("shows one row per leg for a multi-leg trip", async () => {
    mockParseFlightFromText.mockResolvedValue(multiLegFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "SYD to London via Singapore");
    await userEvent.click(
      screen.getByRole("button", { name: /fill in the flights/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/we found 2 flights/i)).not.toBeNull();
    });
    const rows = within(
      screen.getByRole("region", { name: /we found 2 flights/i }),
    ).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[1]!.textContent).toContain("SIN→LHR");
    expect(
      screen.getByRole("button", { name: /review 2 flights/i }),
    ).not.toBeNull();
    expect(screen.getByText("Flight 2: Date")).not.toBeNull();
  });

  // ── Error state ─────────────────────────────────────────────────────────────

  it("shows an error alert when parsing fails", async () => {
    mockParseFlightFromText.mockRejectedValue(
      new Error("AI returned an unexpected response"),
    );
    renderComponent();

    await userEvent.type(getTextarea(), "nonsense");
    await userEvent.click(
      screen.getByRole("button", { name: /fill in the flights/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/could not read the trip/i)).not.toBeNull();
    });

    expect(
      screen.getByText(/AI returned an unexpected response/i),
    ).not.toBeNull();
    expect(onParsed).not.toHaveBeenCalled();
  });

  // ── Editing the text ─────────────────────────────────────────────────────────

  it("editing the text clears the flights found", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "SYD to SIN");
    await userEvent.click(
      screen.getByRole("button", { name: /fill in the flights/i }),
    );
    await waitFor(() => screen.getByText(/we found 1 flight/i));

    await userEvent.type(getTextarea(), " with Qantas");

    expect(screen.queryByText(/we found 1 flight/i)).toBeNull();
    expect(
      screen.getByRole("button", { name: /fill in the flights/i }),
    ).not.toBeNull();
  });

  // ── Keyboard shortcut ───────────────────────────────────────────────────────

  it("Ctrl+Enter triggers parse without clicking the button", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "SYD to SIN");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");

    await waitFor(() => {
      expect(mockParseFlightFromText).toHaveBeenCalledOnce();
    });
  });

  it("Cmd+Enter triggers parse without clicking the button (macOS)", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "SYD to SIN");
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");

    await waitFor(() => {
      expect(mockParseFlightFromText).toHaveBeenCalledOnce();
    });
  });
});
