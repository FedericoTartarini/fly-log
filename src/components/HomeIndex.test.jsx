/* eslint-env vitest */
import { test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "../../test-utils/index.js";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import HomeIndex from "./HomeIndex.jsx";

const mockAuth = vi.fn();
const mockHint = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuth(),
  hasSignedInHint: () => mockHint(),
}));

// Landing pulls in framer-motion and a lazy globe; none of that is what this
// test is about.
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

beforeEach(() => {
  mockAuth.mockReset();
  mockHint.mockReset();
});

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

test("shows the landing page while auth loads, as the build rendered it", async () => {
  mockAuth.mockReturnValue({ user: null, loading: true });
  renderAt();

  expect(await screen.findByText("landing page")).toBeInTheDocument();
});

test("shows a skeleton while auth loads if this browser was signed in", async () => {
  mockAuth.mockReturnValue({ user: null, loading: true });
  mockHint.mockReturnValue(true);
  renderAt();

  await waitFor(() => {
    expect(
      document.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
  });
  expect(screen.queryByText("landing page")).not.toBeInTheDocument();
});
