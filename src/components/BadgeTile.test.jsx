import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../test-utils";
import BadgeTile from "./BadgeTile";

describe("BadgeTile", () => {
  it("links the whole card to the badge's Wikipedia article", () => {
    render(
      <BadgeTile
        badge={{
          id: "to_the_moon",
          category: "distance",
          unlocked: false,
          current: 10,
          target: 384_400,
        }}
      />,
    );
    const link = screen.getByRole("link", {
      name: "To the Moon, not earned yet. Opens Wikipedia.",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Lunar_distance",
    );
    expect(link).toHaveAttribute("data-cy", "badge-to_the_moon");
  });

  it("names an earned linked badge with its date", () => {
    render(
      <BadgeTile
        badge={{
          id: "to_the_moon",
          category: "distance",
          unlocked: true,
          unlockedOn: new Date("2014-11-30T10:00:00Z"),
          current: 384_400,
          target: 384_400,
        }}
      />,
    );
    expect(
      screen.getByRole("link", {
        name: "To the Moon, earned 30 Nov 2014. Opens Wikipedia.",
      }),
    ).toBeInTheDocument();
  });

  it("shows progress in the stub of a locked badge with a target", () => {
    render(
      <BadgeTile
        badge={{
          id: "two_fifty",
          category: "flights",
          unlocked: false,
          current: 195,
          target: 250,
        }}
      />,
    );
    expect(screen.getByText("195 / 250")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "195",
    );
  });

  it("leaves a badge with no link as a plain card", () => {
    render(
      <BadgeTile
        badge={{
          id: "ten_up",
          category: "flights",
          unlocked: false,
          current: 3,
          target: 10,
        }}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});
