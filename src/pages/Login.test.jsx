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

  expect(screen.getByText("Welcome back")).toBeInTheDocument();
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

test("a wrong password shows the agreed message in an alert", async () => {
  firebaseMocks.signInWithEmail.mockRejectedValue({
    code: "auth/invalid-credential",
    message: "Firebase: Error (auth/invalid-credential).",
  });
  renderLogin();

  await userEvent.type(screen.getByLabelText(/^Email/), "a@b.co");
  await userEvent.type(screen.getByLabelText(/^Password/), "nope");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "That email and password do not match. Check them, or create an account if you are new.",
  );
});

test("the stub switches to creating an account and back", async () => {
  renderLogin();

  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(screen.getByText("Start your flight log")).toBeInTheDocument();
  expect(screen.getByLabelText(/^Confirm password/)).toBeInTheDocument();
  expect(screen.queryByText("Forgot password?")).toBeNull();
  expect(screen.getByText("Already have an account?")).toBeInTheDocument();

  // The stub's button now reads "Sign in"; the submit reads "Create account".
  const signIn = screen.getAllByRole("button", { name: "Sign in" });
  await userEvent.click(signIn[signIn.length - 1]);
  expect(screen.getByText("Welcome back")).toBeInTheDocument();
});

test("the show-password button is named and reachable by keyboard", async () => {
  renderLogin();

  const toggle = screen.getByRole("button", { name: "Show password" });
  expect(toggle).not.toHaveAttribute("tabindex", "-1");
  expect(screen.getByLabelText(/^Password/)).toHaveAttribute(
    "type",
    "password",
  );
  await userEvent.click(toggle);
  expect(screen.getByLabelText(/^Password/)).toHaveAttribute("type", "text");
  expect(toggle).toHaveAttribute("aria-pressed", "true");
});
