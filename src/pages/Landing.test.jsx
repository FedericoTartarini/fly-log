/* eslint-env vitest */
import { test, expect, beforeAll } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "../../test-utils/index.js";
import Landing from "./Landing.jsx";

beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

test("renders the hero, the example log and the six features", () => {
  render(<Landing />, { wrapper: MemoryRouter });

  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "Every flight you take, logged and mapped.",
    }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Start your log" })).toHaveLength(
    2,
  );
  expect(
    screen.getByRole("link", { name: "See what it shows" }),
  ).toHaveAttribute("href", "#features");
  expect(
    screen.getByRole("figure", { name: /195 flights, 812,400 km/ }),
  ).toBeInTheDocument();
  // The typed AI request is readable in full before it has typed itself out.
  expect(
    screen.getByText("Rome to Paris on 3 May with Air France, back on the 9th"),
  ).toBeInTheDocument();
  const features = screen
    .getByRole("heading", { name: "What your log shows you" })
    .parentElement.querySelectorAll("li");
  expect(features).toHaveLength(6);
});
