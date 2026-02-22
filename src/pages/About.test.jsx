/* eslint-env vitest */
import { test, expect } from "vitest";
import React from "react";
import { render, screen } from "../../test-utils/index.js"; // use project render wrapper
import About from "./About";

test("has correct text", () => {
  render(<About />);

  expect(screen.getByText("About My Flight Tracker")).toBeInTheDocument();
});
