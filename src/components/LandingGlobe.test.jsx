/* eslint-env vitest */
import { test, expect, beforeAll } from "vitest";
import React from "react";
import { act } from "@testing-library/react";
import { motionValue } from "framer-motion";
import { render, screen } from "../../test-utils/index.js";
import LandingGlobe from "./LandingGlobe.jsx";

beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const chip = () => screen.getByText(/^\d\/5$/).parentElement.textContent;

test("draws the leg that matches the scroll position", () => {
  const progress = motionValue(0);
  render(<LandingGlobe progress={progress} still />);
  expect(chip()).toBe("1/5SYDSIN");

  act(() => progress.set(0.5));
  expect(chip()).toBe("3/5FCOSFO");

  // The trip ends a little before the section unpins.
  act(() => progress.set(0.95));
  expect(chip()).toBe("5/5HNLSYD");
  act(() => progress.set(1));
  expect(chip()).toBe("5/5HNLSYD");
});
