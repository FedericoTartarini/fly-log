import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../test-utils";
import PassportBooklet from "./PassportBooklet";

const badge = (id, unlockedOn) =>
  unlockedOn
    ? {
        id,
        category: "flights",
        unlocked: true,
        unlockedOn: new Date(unlockedOn),
      }
    : { id, category: "flights", unlocked: false };

const badges = [
  badge("first_flight", "2020-01-10"),
  badge("ten_up", "2021-05-20"),
  badge("border_crossed", "2019-06-01"),
  badge("half_century"),
  badge("century"),
  badge("two_fifty"),
];

describe("PassportBooklet", () => {
  it("shows the holder and how many stamps are collected", () => {
    render(<PassportBooklet badges={badges} holder="Ada" />);
    expect(screen.getByText("FlyLog · Passport")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("3 of 6 stamps")).toBeInTheDocument();
  });

  it("puts four stamps on a page, oldest stamp first", () => {
    const { container } = render(<PassportBooklet badges={badges} />);
    const pages = [...container.querySelectorAll('[aria-label^="Page"]')]
      // The dots share the label; the pages are the ones holding stamps.
      .filter((el) => el.querySelector("[data-cy^='stamp-']"));
    expect(pages).toHaveLength(2);

    const firstPage = [...pages[0].querySelectorAll("[data-cy^='stamp-']")];
    expect(firstPage.map((el) => el.dataset.cy)).toEqual([
      "stamp-border_crossed",
      "stamp-first_flight",
      "stamp-ten_up",
      "stamp-half_century",
    ]);
  });

  it("offers page controls only when there is more than one page", () => {
    const { rerender } = render(<PassportBooklet badges={badges} />);
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();

    rerender(<PassportBooklet badges={badges.slice(0, 4)} />);
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
  });
});
