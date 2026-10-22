/**
 * Integration tests for the AI → FlightEntryForm flow.
 *
 * Covers:
 * - The "✨ AI Chat" tab renders FlightChatInput
 * - handleAiParsed pre-fills form fields when onParsed fires
 * - "Go to Manual Entry" (onConfirm) switches the active tab to "Manual Entry"
 * - Multi-leg trips: AI legs fill one card each, add/return buttons, saving N legs
 * - The form still renders correctly when no AI result is provided
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { render, screen, waitFor } from "../../test-utils";
import userEvent from "@testing-library/user-event";

// ── Mock heavy dependencies ──────────────────────────────────────────────────

vi.mock("../utils/referenceData", () => ({
  loadAirportsInfo: vi.fn().mockResolvedValue([]),
  loadAirlinesInfo: vi.fn().mockResolvedValue([]),
}));

vi.mock("../firebaseClient", () => ({
  addFlightsForUser: vi
    .fn()
    .mockResolvedValue({ successCount: 1, errorCount: 0 }),
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
import { addFlightsForUser } from "../firebaseClient";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const leg = {
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  departure_date: "2026-07-10",
  departure_time: "09:00",
  airline_iata: "QF",
  flight_number: "123",
};

const fullParsed = [leg];

const multiLegParsed = [
  leg,
  {
    ...leg,
    departure_airport_iata: "SIN",
    arrival_airport_iata: "LHR",
    departure_time: "23:00",
    flight_number: "1",
  },
  {
    ...leg,
    departure_airport_iata: "LHR",
    arrival_airport_iata: "SYD",
    departure_date: "2026-07-20",
    departure_time: "12:00",
    flight_number: "2",
  },
];

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
      {
        iata: "LHR",
        airport_name: "Heathrow Airport",
        city: "London",
        country: "United Kingdom",
        lat: 51.47,
        lon: -0.4543,
        iso_country: "GB",
        iso_region: "GB-ENG",
        elevation: 25,
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

  it("renders all three tabs: Manual Entry, AI Chat, and CSV Upload", async () => {
    await act(async () => {
      render(<FlightEntryForm />);
    });

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

  it("shows Manual Entry panel by default", async () => {
    await act(async () => {
      render(<FlightEntryForm />);
    });

    expect(screen.getByLabelText(/departure date/i)).not.toBeNull();
  });

  it("switching to AI Chat tab shows the FlightChatInput textarea", async () => {
    await act(async () => {
      render(<FlightEntryForm />);
    });

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
    await act(async () => {
      render(<FlightEntryForm />);
    });

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
    await act(async () => {
      render(<FlightEntryForm />);
    });

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

  // ── Multi-leg trips ──────────────────────────────────────────────────────

  /** Parse with the mocked AI and go back to the manual tab. */
  const parseAndConfirm = async (parsed: unknown) => {
    mockParseFlightFromText.mockResolvedValue(parsed);
    await userEvent.click(
      screen.getByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.AI) }),
    );
    await waitFor(() => screen.getByRole("button", { name: /parse with ai/i }));
    await userEvent.type(getAiTextarea(), "multi-city trip");
    await userEvent.click(
      screen.getByRole("button", { name: /parse with ai/i }),
    );
    await waitFor(() =>
      screen.getByRole("button", { name: /go to manual entry/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /go to manual entry/i }),
    );
  };

  // Select inputs show "SYD - Sydney Airport, ..."; the label also matches
  // each dropdown listbox, so keep only the inputs.
  const selectCodes = (label: RegExp) =>
    screen
      .getAllByLabelText(label)
      .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement)
      .map((input) => input.value.split(" ")[0]);

  it("fills one card per AI-parsed leg and saves each leg as a flight", async () => {
    await act(async () => {
      render(<FlightEntryForm />);
    });
    await parseAndConfirm(multiLegParsed);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /flight 3/i })).not.toBeNull();
    });
    expect(selectCodes(/^departure airport/i)).toEqual(["SYD", "SIN", "LHR"]);
    expect(selectCodes(/^arrival airport/i)).toEqual(["SIN", "LHR", "SYD"]);

    await userEvent.click(
      screen.getByRole("button", { name: /save flights/i }),
    );

    // All legs go in one batch write, one document per leg.
    await waitFor(() => expect(addFlightsForUser).toHaveBeenCalledOnce());
    const saved = vi.mocked(addFlightsForUser).mock.calls[0]?.[1];
    expect(saved).toHaveLength(3);
    expect(saved?.[1]).toMatchObject({
      departure_airport_iata: "SIN",
      arrival_airport_iata: "LHR",
      airline_iata: "QF",
      departure_time: "23:00",
      flight_number: "1",
    });
  });

  it("'Add another flight' starts the new leg where the last one landed", async () => {
    await act(async () => {
      render(<FlightEntryForm />);
    });
    await parseAndConfirm(fullParsed);

    await userEvent.click(
      screen.getByRole("button", { name: /add another flight/i }),
    );

    expect(selectCodes(/^departure airport/i)).toEqual(["SYD", "SIN"]);
    expect(selectCodes(/^arrival airport/i)).toEqual(["SIN", ""]);
    expect(selectCodes(/^airline/i)).toEqual(["QF", "QF"]);
  });

  it("'Add return trip' appends the legs reversed, then hides itself", async () => {
    await act(async () => {
      render(<FlightEntryForm />);
    });
    await parseAndConfirm(multiLegParsed.slice(0, 2)); // SYD → SIN → LHR

    await userEvent.click(
      screen.getByRole("button", { name: /add return trip/i }),
    );

    expect(selectCodes(/^departure airport/i)).toEqual([
      "SYD",
      "SIN",
      "LHR",
      "SIN",
    ]);
    expect(selectCodes(/^arrival airport/i)).toEqual([
      "SIN",
      "LHR",
      "SIN",
      "SYD",
    ]);
    expect(
      screen.queryByRole("button", { name: /add return trip/i }),
    ).toBeNull();

    // Adding a further flight after the return must not bring the button back.
    await userEvent.click(
      screen.getByRole("button", { name: /add another flight/i }),
    );
    expect(
      screen.queryByRole("button", { name: /add return trip/i }),
    ).toBeNull();
  });

  it("'Add return trip' is hidden until a leg has both airports", async () => {
    await act(async () => {
      render(<FlightEntryForm />);
    });

    expect(
      screen.queryByRole("button", { name: /add return trip/i }),
    ).toBeNull();
  });

  it("keeps the form and shows an error when the batch save fails", async () => {
    vi.mocked(addFlightsForUser).mockResolvedValueOnce({
      successCount: 0,
      errorCount: 3,
    });
    await act(async () => {
      render(<FlightEntryForm />);
    });
    await parseAndConfirm(multiLegParsed);

    await userEvent.click(
      screen.getByRole("button", { name: /save flights/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(
        /3 flight\(s\) could not be saved/,
      );
    });
    expect(selectCodes(/^departure airport/i)).toEqual(["SYD", "SIN", "LHR"]);
  });

  it("removing a leg drops it from the form", async () => {
    await act(async () => {
      render(<FlightEntryForm />);
    });
    await parseAndConfirm(multiLegParsed);

    await userEvent.click(
      screen.getByRole("button", { name: /remove flight 2/i }),
    );

    expect(selectCodes(/^departure airport/i)).toEqual(["SYD", "LHR"]);
  });

  // ── Edit mode hides tabs ──────────────────────────────────────────────────

  it("does not render tabs when in editing mode (flight prop provided)", async () => {
    const existingFlight = {
      id: "abc123",
      departure_date: "2026-07-10",
      departure_airport_iata: "SYD",
      arrival_airport_iata: "SIN",
      airline_iata: "QF",
      flight_number: "123",
    };

    await act(async () => {
      render(<FlightEntryForm flight={existingFlight} />);
    });

    expect(
      screen.queryByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.AI) }),
    ).toBeNull();
    expect(
      screen.queryByRole("tab", { name: tabName(FLIGHT_ENTRY_TABS.CSV) }),
    ).toBeNull();
    expect(screen.getByLabelText(/departure date/i)).not.toBeNull();
  });
});
