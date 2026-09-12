/* eslint-env vitest */
import { test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "../../test-utils/index.js";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import HomeIndex from "./HomeIndex.jsx";

const mockAuth = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuth(),
}));

// Landing pulls in framer-motion, images and a lazy FeatureSection; none of
// that is what this test is about.
vi.mock("../pages/Landing.jsx", () => ({
  default: () => <div>landing page</div>,
}));

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomeIndex />} />
        <Route path="/stats" element={<div>stats page</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => mockAuth.mockReset());

test("shows the landing page to logged-out visitors instead of redirecting", async () => {
  mockAuth.mockReturnValue({ user: null, loading: false });
  renderAt();

  expect(await screen.findByText("landing page")).toBeInTheDocument();
});

test("sends signed-in users on to their stats", async () => {
  mockAuth.mockReturnValue({ user: { uid: "abc" }, loading: false });
  renderAt();

  expect(await screen.findByText("stats page")).toBeInTheDocument();
});

test("waits for auth rather than flashing the landing page", () => {
  mockAuth.mockReturnValue({ user: null, loading: true });
  renderAt();

  expect(screen.queryByText("landing page")).not.toBeInTheDocument();
});
