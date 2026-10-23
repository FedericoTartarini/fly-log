import { describe, it, expect } from "vitest";
import { formatDate, formatTimeRange, arrivalDayOffset } from "./dateUtils";

describe("formatDate", () => {
  it("formats a Firestore-like seconds object to 'DD MMM YY'", () => {
    // 10 Nov 2024 -> timestamp seconds
    const d = new Date(Date.UTC(2024, 10, 10, 0, 0, 0)); // month 10 == November
    const seconds = Math.floor(d.getTime() / 1000);
    const fsObj = { seconds, nanoseconds: 0 };

    const out = formatDate(fsObj, "DD MMM YY", "en-GB");
    // en-GB month names are in English; expect '10 Nov 24'
    expect(out).toBe("10 Nov 24");
  });

  it("formats ISO date string with format token", () => {
    const out = formatDate("2024-11-10", "DD MMM YY", "en-GB");
    expect(out).toBe("10 Nov 24");
  });

  it("formats Date object when no format provided (locale)", () => {
    const d = new Date(2024, 10, 10); // local timezone
    const out = formatDate(d, undefined, "en-GB");
    // depending on environment locale timezone differences, just ensure not empty and contains 10
    expect(out).toContain("10");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("not-a-date", "DD MMM YY")).toBe("");
  });
});

describe("formatTimeRange", () => {
  it("shows departure alone when arrival is unknown", () => {
    expect(formatTimeRange({ departure_time: "09:40" })).toBe("09:40");
    expect(formatTimeRange({})).toBe("");
  });

  it("treats a missing arrival date as the same day", () => {
    expect(
      formatTimeRange({
        departure_date: "2024-03-10",
        departure_time: "09:40",
        arrival_time: "17:15",
      }),
    ).toBe("09:40 → 17:15");
  });

  it("marks an overnight arrival and a dateline arrival the day before", () => {
    expect(
      formatTimeRange({
        departure_date: "2024-03-10",
        departure_time: "21:30",
        arrival_date: "2024-03-11",
        arrival_time: "05:10",
      }),
    ).toBe("21:30 → 05:10 +1");
    // SYD -> HNL lands on the calendar day before it left.
    expect(
      formatTimeRange({
        departure_date: "2024-03-10",
        departure_time: "21:30",
        arrival_date: "2024-03-09",
        arrival_time: "10:00",
      }),
    ).toBe("21:30 → 10:00 −1");
  });

  it("works across a DST change, where the gap is not exactly 24 hours", () => {
    expect(
      arrivalDayOffset(new Date(2024, 2, 30), new Date(2024, 2, 31)),
    ).toBe(1);
  });
});
