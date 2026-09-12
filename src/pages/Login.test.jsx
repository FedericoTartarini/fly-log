/* eslint-env vitest */
import { test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "../../test-utils/index.js"; // use project render wrapper
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

const firebaseMocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  auth: { name: "test-auth" },
}));

vi.mock("../firebaseClient", () => firebaseMocks);

const renderLogin = () =>
  render(<Login />, {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

test("renders login form with translated strings", () => {
  render(<Login />, {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  });

  expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  // Use getByText for labels which is more robust in this test env
  expect(screen.getByText("Email")).toBeInTheDocument();
  expect(screen.getByText("Password")).toBeInTheDocument();
});

test("Continue with Google calls signInWithGoogle", async () => {
  firebaseMocks.signInWithGoogle.mockResolvedValue({});
  renderLogin();

  await userEvent.click(screen.getByText("Continue with Google"));

  expect(firebaseMocks.signInWithGoogle).toHaveBeenCalledOnce();
  expect(screen.queryByTestId("login-error")).toBeNull();
});

test("closing the Google popup is not surfaced as an error", async () => {
  firebaseMocks.signInWithGoogle.mockRejectedValue({
    code: "auth/popup-closed-by-user",
  });
  renderLogin();

  await userEvent.click(screen.getByText("Continue with Google"));

  expect(document.querySelector('[data-cy="login-error"]')).toBeNull();
});

test("a real Google sign-in failure shows a friendly message", async () => {
  firebaseMocks.signInWithGoogle.mockRejectedValue({
    code: "auth/account-exists-with-different-credential",
    message: "Firebase: Error (auth/account-exists-with-different-credential).",
  });
  renderLogin();

  await userEvent.click(screen.getByText("Continue with Google"));

  expect(
    await screen.findByText(/already registered with a password/i),
  ).toBeInTheDocument();
});
