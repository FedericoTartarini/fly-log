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

  it("gives maskable icons their own files, separate from the any icons", () => {
    // `purpose` is a space-separated list and defaults to "any".
    const purposes = (icon: { purpose?: string }) =>
      (icon.purpose ?? "any").split(/\s+/).filter(Boolean);
    const anySources = new Set(
      manifest.icons
        .filter((icon: { purpose?: string }) => purposes(icon).includes("any"))
        .map((icon: { src: string }) => icon.src),
    );

    for (const icon of manifest.icons) {
      if (!purposes(icon).includes("maskable")) continue;
      // Maskable artwork needs a safe-zone padding that the any icons don't have.
      expect(purposes(icon)).not.toContain("any");
      expect(anySources.has(icon.src)).toBe(false);
    }
  });
});
