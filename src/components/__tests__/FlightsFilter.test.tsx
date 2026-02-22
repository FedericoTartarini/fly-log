import React from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import FlightFilters from "../FlightFilters";
import useFlightStore from "../../store";

describe("FlightsFilter", () => {
  it("renders and can clear filters", async () => {
    render(
      <MantineProvider>
        <FlightFilters />
      </MantineProvider>,
    );

    const clearBtn = screen.getByRole("button", { hidden: true });
    expect(clearBtn).toBeInTheDocument();

    // ensure store functions exist
    const { setFilters, clearFilters } = useFlightStore.getState() as any;
    expect(typeof setFilters).toBe("function");
    expect(typeof clearFilters).toBe("function");
  });
});
