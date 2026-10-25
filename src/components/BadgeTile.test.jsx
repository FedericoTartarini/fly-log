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
      name: "Read about To the Moon on Wikipedia",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Lunar_distance",
    );
    expect(link).toHaveAttribute("data-cy", "badge-to_the_moon");
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
