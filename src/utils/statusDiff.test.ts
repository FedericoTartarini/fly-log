import { describe, it, expect } from "vitest";
import { diffAgainstStatus, isAutoCheckable } from "./statusDiff";

const NOW = new Date(2026, 6, 10, 15, 0); // 10 July 2026, local

describe("isAutoCheckable", () => {
  const flight = (
    departure_date: Date,
    flight_number: string | null = "1",
  ) => ({
    departure_date,
    flight_number,
  });

  it("checks flights departing today through seven days ahead", () => {
    expect(isAutoCheckable(flight(new Date(2026, 6, 10)), NOW)).toBe(true);
    expect(isAutoCheckable(flight(new Date(2026, 6, 17)), NOW)).toBe(true);
  });

  it("skips past flights, far-future flights and flights with no number", () => {
    expect(isAutoCheckable(flight(new Date(2026, 6, 9)), NOW)).toBe(false);
    expect(isAutoCheckable(flight(new Date(2026, 6, 18)), NOW)).toBe(false);
    expect(isAutoCheckable(flight(new Date(2026, 6, 12), null), NOW)).toBe(
      false,
    );
  });
});

describe("diffAgainstStatus", () => {
  const leg = {
    departure: { scheduledTime: { local: "2026-07-10 21:30+10:00" } },
    arrival: { scheduledTime: { local: "2026-07-11 05:10+08:00" } },
    aircraft: { model: "Airbus A380" },
  };

  it("lists what the schedule fills in or corrects", () => {
    const changes = diffAgainstStatus(
      { departure_time: "21:00", arrival_time: null },
      leg,
    );
    expect(changes).toEqual([
      { field: "departure_time", entered: "21:00", found: "21:30" },
      { field: "arrival_date", entered: null, found: "2026-07-11" },
      { field: "arrival_time", entered: null, found: "05:10" },
      { field: "aircraft_type_name", entered: null, found: "Airbus A380" },
    ]);
  });

  it("reports nothing when the entry already matches", () => {
    expect(
      diffAgainstStatus(
        {
          departure_time: "21:30",
          arrival_date: "2026-07-11",
          arrival_time: "05:10",
          aircraft_type_name: "Airbus A380",
        },
        leg,
      ),
    ).toEqual([]);
  });

  it("never proposes blanking a field the schedule does not have", () => {
    expect(
      diffAgainstStatus({ departure_time: "09:00", arrival_time: "17:00" }, {}),
    ).toEqual([]);
  });

  it("does not propose an arrival date for a same-day landing", () => {
    const sameDay = {
      departure: { scheduledTime: { local: "2026-07-10 09:00+10:00" } },
      arrival: { scheduledTime: { local: "2026-07-10 10:30+10:00" } },
    };
    expect(
      diffAgainstStatus(
        { departure_time: "09:00", arrival_time: "10:30" },
        sameDay,
      ),
    ).toEqual([]);
  });
});
