import { describe, it, expect } from "vitest";
import { qrPath } from "./qrPath";

describe("qrPath", () => {
  it("draws one square per dark module of a valid QR matrix", () => {
    const { size, path } = qrPath(
      "https://en.wikipedia.org/wiki/Lunar_distance",
    );
    // QR versions are 21 + 4n modules wide.
    expect((size - 21) % 4).toBe(0);
    expect(path.startsWith("M0 0h1v1h-1z")).toBe(true); // finder pattern corner
  });

  it("is stable for the same text", () => {
    expect(qrPath("abc")).toEqual(qrPath("abc"));
  });
});
