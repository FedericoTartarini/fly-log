import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "../../test-utils/index.js";
import { makeRouterWrapper } from "../../test-utils/wrappers.jsx";
import BadgeStrip from "./BadgeStrip.jsx";
import useFlightStore from "../store.ts";
import {
  evaluateBadges,
  sortForShelf,
  pickStripBadges,
} from "../utils/badges.ts";
import en from "../../public/locales/en/flights.json";

// Twelve domestic flights: enough for "Ten up", with other badges in progress.
const flights = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  departure_date: `2025-01-${String(i + 1).padStart(2, "0")}`,
  departure_airport_iata: "SYD",
  arrival_airport_iata: "MEL",
  departure_country: "AU",
  arrival_country: "AU",
  distance_km: 705,
}));

describe("BadgeStrip", () => {
  it("says what each badge asks for, not just its name", () => {
    useFlightStore.setState({ allFlights: flights });
    render(<BadgeStrip />, { wrapper: makeRouterWrapper() });

    const latest = screen.getByRole("region", { name: "Latest" });
    expect(within(latest).getByText("Log 10 flights.")).toBeInTheDocument();

    const next = pickStripBadges(sortForShelf(evaluateBadges(flights))).find(
      (b) => !b.unlocked,
    );
    const closest = screen.getByRole("region", { name: "Closest next" });
    expect(
      within(closest).getByText(en.badges.items[next.id].criterion),
    ).toBeInTheDocument();
    expect(within(closest).getByRole("progressbar")).toBeInTheDocument();
  });
});
