import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MyAppShell from "./MyAppShell.jsx";
import useFlightStore from "../store.ts";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: { displayName: "Ada Byron Lovelace", email: "ada@example.com" },
    loading: false,
    signOut: vi.fn(),
  }),
}));
vi.mock("../components/FlightEntryForm.tsx", () => ({
  default: () => <div data-testid="flight-entry-form" />,
}));

// A phone-sized screen, so the tab bar and the floating add button show.
const asPhone = () =>
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

const renderAt = (path) =>
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<MyAppShell />}>
            <Route path="*" element={<p>page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );

describe("MyAppShell on a phone", () => {
  beforeEach(() => {
    asPhone();
    useFlightStore.setState({ addFlightOpened: false });
  });

  it("marks the current page in the tab bar", () => {
    renderAt("/flights");
    const tabs = screen.getByRole("navigation", { name: "Main" });
    const current = tabs.querySelectorAll('[aria-current="page"]');
    expect([...current].map((a) => a.textContent)).toEqual(["Flights"]);
  });

  it("shows the first and last initials on the account button", () => {
    renderAt("/stats");
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toHaveTextContent("AL");
  });

  it("opens the add-flight form from the floating button", async () => {
    renderAt("/stats");
    await userEvent.click(screen.getByRole("button", { name: "Add flight" }));
    expect(await screen.findByTestId("flight-entry-form")).toBeInTheDocument();
  });
});
