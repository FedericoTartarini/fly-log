import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "../../test-utils/index.js";
import Changelog from "./Changelog";
import entries from "../constants/changelog.json";

describe("Changelog", () => {
  // A feature PR adds its entry by hand, so catch one added out of order.
  it("keeps entries newest first, one per date", () => {
    const dates = entries.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("shows each entry under its date", () => {
    render(<Changelog />);
    expect(
      screen.getByRole("heading", { level: 1, name: "What's new" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(
      entries.length,
    );
    expect(screen.getByText("8 November 2026")).toBeInTheDocument();
    expect(screen.getByText(entries[0].items[0])).toBeInTheDocument();
  });

  it("names the page in the browser tab", () => {
    render(<Changelog />);
    expect(document.title).toBe("What's new – FlyLog");
  });
});
