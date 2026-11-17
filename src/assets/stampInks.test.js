import { describe, it, expect } from "vitest";
import stampInks from "./stampInks.json";
import { tokens } from "../theme.js";

// WCAG 2.x relative luminance and contrast ratio.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("stampInks", () => {
  it("has an ink for common countries", () => {
    for (const code of [
      "IT",
      "FR",
      "DE",
      "GB",
      "US",
      "AU",
      "JP",
      "CN",
      "IN",
      "BR",
    ]) {
      expect(stampInks[code], code).toHaveLength(2);
    }
  });

  // The rarest family wins, so tricolours with red leave red behind, while
  // red-and-white flags stay red.
  it("inks in the rarest flag colour", () => {
    const strongest = (hex) =>
      ["red", "green", "blue"][
        [1, 3, 5]
          .map((i) => parseInt(hex.slice(i, i + 2), 16))
          .reduce((best, v, i, all) => (v > all[best] ? i : best), 0)
      ];
    const expected = {
      IT: "green",
      MX: "green",
      FR: "blue",
      US: "blue",
      GB: "blue",
      JP: "red",
      CN: "red",
      CA: "red",
      CH: "red",
      TR: "red",
    };
    for (const [code, colour] of Object.entries(expected)) {
      expect(strongest(stampInks[code][0]), code).toBe(colour);
    }
  });

  it("reaches 4.5:1 on the stamp background in both schemes", () => {
    for (const [code, [light, dark]] of Object.entries(stampInks)) {
      expect(
        contrast(light, tokens.light.surface),
        `${code} light`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(dark, tokens.dark.surface),
        `${code} dark`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
