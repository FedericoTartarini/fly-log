import React from "react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, userEvent } from "../../test-utils/index.js";
import Passport from "./Passport.jsx";
import useFlightStore from "../store.ts";
import { DEFAULT_FILTERS } from "../utils/activeFilters.ts";

const flights = [
  { id: "1", departure_date: "2024-03-01", arrival_country: "JP" },
  { id: "2", departure_date: "2025-03-01", arrival_country: "JP" },
  { id: "3", departure_date: "2025-04-01", arrival_country: "SG" },
];

describe("Passport", () => {
  it("opens the past flights to a stamp's country", async () => {
    useFlightStore.setState({
      allFlights: flights,
      filteredFlights: flights,
      isLoading: false,
      error: null,
      filters: { ...DEFAULT_FILTERS, airline: "QF" },
    });
    render(
      <MemoryRouter initialEntries={["/passport"]}>
        <Routes>
          <Route path="/passport" element={<Passport />} />
          <Route path="/flights" element={<div>flights page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: /Japan/ }));

    expect(screen.getByText("flights page")).toBeInTheDocument();
    const { filters, filteredFlights } = useFlightStore.getState();
    expect(filters).toEqual({
      ...DEFAULT_FILTERS,
      when: "past",
      arrivalCountry: "JP",
    });
    expect(filteredFlights.map((f) => f.id)).toEqual(["1", "2"]);
  });
});
