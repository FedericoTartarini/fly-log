import { describe, expect, it } from "vitest";
import { buildTourRoutes } from "./tourRoutes";

const flight = (id, date, extra = {}) => ({
  id,
  departure_date: date,
  departure_airport_iata: "SYD",
  arrival_airport_iata: "MEL",
  departure_coordinates: [-33.94, 151.18],
  arrival_coordinates: [-37.67, 144.84],
  ...extra,
});

const now = new Date(2026, 10, 10, 12); // 10 Nov 2026, local time

describe("buildTourRoutes", () => {
  it("plays the flights oldest first", () => {
    const routes = buildTourRoutes(
      [flight("b", "2025-05-01"), flight("a", "2024-01-09")],
      now,
    );
    expect(routes.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("orders flights on the same day by departure time", () => {
    const routes = buildTourRoutes(
      [
        flight("late", "2024-06-01", { departure_time: "08:30" }),
        flight("early", "2024-06-01", { departure_time: "03:15" }),
      ],
      now,
    );
    expect(routes.map((r) => r.id)).toEqual(["early", "late"]);
  });

  it("leaves out flights with no date or no coordinates", () => {
    const routes = buildTourRoutes(
      [
        flight("ok", "2024-01-09"),
        flight("undated", null),
        flight("nowhere", "2024-02-01", { arrival_coordinates: null }),
      ],
      now,
    );
    expect(routes.map((r) => r.id)).toEqual(["ok"]);
  });

  it("marks flights from today on as upcoming", () => {
    const routes = buildTourRoutes(
      [
        flight("past", "2026-11-09"),
        flight("today", "2026-11-10"),
        flight("later", "2026-12-01"),
      ],
      now,
    );
    expect(routes.map((r) => r.upcoming)).toEqual([false, true, true]);
  });

  it("carries the flight number and distance for the pass", () => {
    const [route] = buildTourRoutes(
      [
        flight("qf", "2025-08-10", {
          airline_iata: "QF",
          flight_number: "1",
          distance_km: 6293,
        }),
      ],
      now,
    );
    expect(route).toMatchObject({
      fromCode: "SYD",
      toCode: "MEL",
      flightNumber: "QF1",
      km: 6293,
    });
  });
});
