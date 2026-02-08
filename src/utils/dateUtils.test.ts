import { describe, it, expect } from "vitest";
import { formatDate } from "./dateUtils";

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
