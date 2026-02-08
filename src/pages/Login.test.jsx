/* eslint-env vitest */
/* global test, expect */
import React from "react";
import { render, screen } from "../../test-utils/index.js"; // use project render wrapper
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import Login from "./Login";

test("renders login form with translated strings", () => {
  render(<Login />, {
    wrapper: ({ children }) => (
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    ),
  });

  expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  // Use getByText for labels which is more robust in this test env
  expect(screen.getByText("Email")).toBeInTheDocument();
  expect(screen.getByText("Password")).toBeInTheDocument();
});
