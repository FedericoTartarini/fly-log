/* eslint-env vitest */
/* global test, expect */
import React from "react";
import { render, screen } from "../../test-utils/index.js"; // use project render wrapper
import Login from "./Login";

test("renders login form with translated strings", () => {
  render(<Login />);

  expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  // Use getByText for labels which is more robust in this test env
  expect(screen.getByText("Email")).toBeInTheDocument();
  expect(screen.getByText("Password")).toBeInTheDocument();
});
