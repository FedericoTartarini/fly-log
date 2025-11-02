/* eslint-env vitest */
/* global beforeAll, test, expect */
import React from "react";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import Login from "./Login";

// For tests we will override i18n resources to avoid HTTP backend
beforeAll(() => {
  i18n.init({
    lng: "en",
    resources: {
      en: {
        login: {
          title: "Welcome Back",
          email: "Email",
          password: "Password",
          sign_in: "Sign in",
        },
      },
    },
    ns: ["login"],
    defaultNS: "login",
    react: { useSuspense: false },
  });
});

test("renders login form with translated strings", () => {
  render(
    <I18nextProvider i18n={i18n}>
      <Login />
    </I18nextProvider>,
  );

  expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
});
