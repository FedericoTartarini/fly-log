/**
 * Tests for FlightChatInput component.
 *
 * Covers:
 * - Initial render (examples, textarea, parse button)
 * - Successful parse → success alert, extracted badges, missing-fields warning
 * - Round-trip parse → return leg section shown
 * - "Go to Manual Entry" button calls onConfirm
 * - "Start over" / reset flow
 * - Error state when parseFlightFromText rejects
 * - Ctrl+Enter keyboard shortcut triggers parse
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils/index.js";
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

const fullFlight = {
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  departure_date: "2026-07-10",
  departure_time: "09:00",
  airline_iata: "QF",
  flight_number: "1",
  return_date: null,
  return_time: null,
  return_flight_number: null,
};

const returnFlight = {
  ...fullFlight,
  return_date: "2026-07-20",
  return_time: "14:30",
  return_flight_number: "2",
};

const partialFlight = {
  departure_airport_iata: "SYD",
  arrival_airport_iata: null, // missing → triggers warning
  departure_date: null, // missing
  departure_time: null,
  airline_iata: null, // missing
  flight_number: null,
  return_date: null,
  return_time: null,
  return_flight_number: null,
};

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

  it("renders the textarea, parse button, and examples", () => {
    renderComponent();

    expect(getTextarea()).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /parse with ai/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/try one of these examples/i)).toBeInTheDocument();
  });

  it("parse button is disabled when textarea is empty", () => {
    renderComponent();
    expect(
      screen.getByRole("button", { name: /parse with ai/i }),
    ).toBeDisabled();
  });

  it("parse button is enabled after typing in the textarea", async () => {
    renderComponent();
    await userEvent.type(getTextarea(), "SYD to SIN");
    expect(
      screen.getByRole("button", { name: /parse with ai/i }),
    ).toBeEnabled();
  });

  it("clicking an example populates the textarea", async () => {
    renderComponent();
    const firstExample =
      "I flew from Sydney to Singapore on the 10th of July 2026 with Qantas";
    // The component renders each example wrapped in quotes: `"${example}"`
    await userEvent.click(screen.getByText(`"${firstExample}"`));
    expect(getTextarea().value).toBe(firstExample);
  });

  // ── Successful full parse ───────────────────────────────────────────────────

  it("shows success alert with extracted field badges after a successful parse", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "SYD to SIN on 10 July with Qantas");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/flight details extracted/i)).toBeInTheDocument();
    });

    expect(screen.getByText("SYD")).toBeInTheDocument();
    expect(screen.getByText("SIN")).toBeInTheDocument();
    expect(screen.getByText("2026-07-10")).toBeInTheDocument();
    expect(screen.getByText("QF")).toBeInTheDocument();
    expect(onParsed).toHaveBeenCalledWith(fullFlight);
  });

  it("shows the 'Go to Manual Entry' button after a successful parse", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "any text");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /go to manual entry/i }),
      ).toBeInTheDocument();
    });
  });

  it("calls onConfirm when 'Go to Manual Entry' is clicked", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "any text");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() =>
      screen.getByRole("button", { name: /go to manual entry/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /go to manual entry/i }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  // ── Missing fields warning ──────────────────────────────────────────────────

  it("shows a missing-fields warning when required fields are null", async () => {
    mockParseFlightFromText.mockResolvedValue(partialFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "vague description");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/some details are missing/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Arrival Airport/)).toBeInTheDocument();
    expect(screen.getByText(/Departure Date/)).toBeInTheDocument();
    expect(screen.getByText(/Airline/)).toBeInTheDocument();
  });

  it("does NOT show missing-fields warning when all required fields are present", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "full details");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() => screen.getByText(/flight details extracted/i));

    expect(
      screen.queryByText(/some details are missing/i),
    ).not.toBeInTheDocument();
  });

  // ── Return flight section ───────────────────────────────────────────────────

  it("shows a return leg section when return_date is present", async () => {
    mockParseFlightFromText.mockResolvedValue(returnFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "SYD to SIN returning 20 July");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/return flight/i)).toBeInTheDocument();
    });

    expect(screen.getByText("2026-07-20")).toBeInTheDocument();
    expect(screen.getByText("14:30")).toBeInTheDocument();
  });

  it("labels the first section 'Outbound flight' when a return is detected", async () => {
    mockParseFlightFromText.mockResolvedValue(returnFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "return trip");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() => screen.getByText(/outbound flight/i));
    expect(screen.getByText(/outbound flight/i)).toBeInTheDocument();
  });

  // ── Error state ─────────────────────────────────────────────────────────────

  it("shows an error alert when parsing fails", async () => {
    mockParseFlightFromText.mockRejectedValue(
      new Error("AI returned an unexpected response"),
    );
    renderComponent();

    await userEvent.type(getTextarea(), "nonsense");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/could not parse flight/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/AI returned an unexpected response/i),
    ).toBeInTheDocument();
    expect(onParsed).not.toHaveBeenCalled();
  });

  // ── Reset flow ──────────────────────────────────────────────────────────────

  it("'Start over' button resets the UI back to the initial state", async () => {
    mockParseFlightFromText.mockResolvedValue(fullFlight);
    renderComponent();

    await userEvent.type(getTextarea(), "SYD to SIN");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );
    await waitFor(() => screen.getByRole("button", { name: /start over/i }));

    await userEvent.click(screen.getByRole("button", { name: /start over/i }));

    expect(getTextarea().value).toBe("");
    expect(
      screen.queryByText(/flight details extracted/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /parse with ai/i }),
    ).toBeInTheDocument();
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
