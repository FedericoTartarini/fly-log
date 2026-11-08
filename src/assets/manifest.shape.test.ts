import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("manifest.json icons", () => {
  const manifestPath = path.resolve(process.cwd(), "public/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  it("declares icon dimensions matching the actual PNG dimensions", () => {
    for (const icon of manifest.icons) {
      const iconPath = path.resolve(
        process.cwd(),
        "public",
        icon.src.replace(/^\//, ""),
      );
      expect(fs.existsSync(iconPath)).toBe(true);

      const buf = fs.readFileSync(iconPath);
      // PNG header bytes 16..24 contain width and height as 32-bit big-endian unsigned integers
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);

      expect(`${width}x${height}`).toBe(icon.sizes);
    }
  });

  it("does not declare maskable icons without dedicated padded assets", () => {
    for (const icon of manifest.icons) {
      expect(icon.purpose).not.toBe("maskable");
    }
  });
});
