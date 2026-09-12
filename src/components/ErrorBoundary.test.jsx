/* eslint-env vitest */
import { test, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "../../test-utils/index.js";
import ErrorBoundary from "./ErrorBoundary";

const Boom = () => {
  throw new Error("boom");
};

test("shows a friendly fallback instead of crashing the app", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <ErrorBoundary resetKey="/stats">
      <Boom />
    </ErrorBoundary>,
  );

  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
});

test("recovers once the route changes", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  const { rerender } = render(
    <ErrorBoundary resetKey="/stats">
      <Boom />
    </ErrorBoundary>,
  );
  expect(screen.getByText("Something went wrong")).toBeInTheDocument();

  rerender(
    <ErrorBoundary resetKey="/flights">
      <div>flights page</div>
    </ErrorBoundary>,
  );

  expect(screen.getByText("flights page")).toBeInTheDocument();
});
