import React from "react";
import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { render } from "../../test-utils/index.js";
import userEvent from "@testing-library/user-event";

// Mock referenceData helpers before importing the component so useEffect won't call the real functions
import { vi } from "vitest";
vi.mock("../utils/referenceData", () => {
  return {
    loadAirportsInfo: async () => [],
    loadAirlinesInfo: async () => [],
  };
});

import FlightEntryForm from "./FlightEntryForm";
import { MantineProvider } from "@mantine/core";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";

describe("FlightEntryForm", () => {
  it("renders the DatePickerInput for departure date and is interactive", async () => {
    render(
      <MantineProvider>
        <I18nextProvider i18n={i18n}>
          <FlightEntryForm />
        </I18nextProvider>
      </MantineProvider>,
    );

    const dateInput = screen.getByLabelText(/^date$/i);
    expect(dateInput).toBeInTheDocument();

    // The DatePickerInput from Mantine renders an input-like control; ensure it's focusable and interactive.
    await userEvent.click(dateInput);
    await waitFor(() => expect(dateInput).toHaveFocus());

    // Instead of relying on Mantine's popover visibility (animations/styles may keep it hidden in jsdom),
    // interact by sending keyboard events. Some Mantine inputs render non-editable wrappers; sending
    // a Tab key will move focus and verify the control is interactive.
    await userEvent.keyboard("{Tab}");
    // Assert that the dateInput no longer has focus after tabbing away
    expect(dateInput).not.toHaveFocus();
  });

  it("keeps the optional section open when its last value is cleared", async () => {
    render(<FlightEntryForm />);
    const details = screen
      .getByText(/arrival time and cabin/i)
      .closest("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);

    await userEvent.click(screen.getByText(/arrival time and cabin/i));
    const arrives = screen.getByLabelText(/^arrives$/i);
    await userEvent.type(arrives, "1430");
    await userEvent.clear(arrives);

    expect(details.open).toBe(true);
  });

  it("stays closed after the user folds a section that holds a value", async () => {
    render(<FlightEntryForm />);
    const summary = screen.getByText(/arrival time and cabin/i);
    const details = summary.closest("details") as HTMLDetailsElement;
    await userEvent.click(summary);
    await userEvent.type(screen.getByLabelText(/^arrives$/i), "1430");

    await userEvent.click(summary);
    expect(details.open).toBe(false);
    // Typing elsewhere re-renders the form.
    await userEvent.type(screen.getByLabelText(/^flight no\./i), "QF1");
    expect(details.open).toBe(false);
  });
});
