import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import FlightFilters from "../FlightFilters";
import useFlightStore from "../../store";
import type { FlightStoreState } from "../../store";
import { vi } from "vitest";

vi.mock("../../utils/referenceData", async () => {
  const actual = await vi.importActual<
    typeof import("../../utils/referenceData")
  >("../../utils/referenceData");
  return {
    ...actual,
    loadAirportsInfo: vi.fn().mockResolvedValue([]),
  };
});

describe("FlightsFilter", () => {
  it("clears filters when the clear button is clicked", async () => {
    const { setFilters } = useFlightStore.getState() as FlightStoreState;
    act(() => {
      setFilters({
        airline: "ABC",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        minDuration: 1,
        maxDuration: 3,
      });
    });

    render(
      <MantineProvider>
        <FlightFilters />
      </MantineProvider>,
    );

    const clearBtn = screen.getByRole("button", { name: /clear/i });
    await userEvent.click(clearBtn);

    await waitFor(() => {
      expect(useFlightStore.getState().filters).toEqual({
        airline: null,
        departureAirport: null,
        arrivalAirport: null,
        minDuration: null,
        maxDuration: null,
      });
    });
  });
});
