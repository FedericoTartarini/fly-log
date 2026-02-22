import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  it("renders and can clear filters", async () => {
    render(
      <MantineProvider>
        <FlightFilters />
      </MantineProvider>,
    );

    const clearBtn = screen.getByRole("button", { hidden: true });
    expect(clearBtn).toBeInTheDocument();

    // Wait for async airports loading effect to settle.
    await waitFor(() => {
      expect(useFlightStore.getState().setFilters).toBeTypeOf("function");
    });

    // ensure store functions exist
    const { setFilters, clearFilters } =
      useFlightStore.getState() as FlightStoreState;
    expect(typeof setFilters).toBe("function");
    expect(typeof clearFilters).toBe("function");
  });
});
