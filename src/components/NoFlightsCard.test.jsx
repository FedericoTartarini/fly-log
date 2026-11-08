import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store.ts", () => ({
  default: vi.fn(),
}));

import { render, screen, fireEvent } from "../../test-utils/index.js";
import NoFlightsCard from "./NoFlightsCard";
import useFlightStore from "../store.ts";

const setAddFlightOpened = vi.fn();

describe("NoFlightsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlightStore.mockImplementation((selector) =>
      selector({ setAddFlightOpened }),
    );
  });

  it("welcomes a new user on Stats with the totals at zero", () => {
    render(<NoFlightsCard welcome />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Welcome to FlyLog",
    );
    expect(screen.getByText("Kilometres")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("uses the page's own title and text elsewhere", () => {
    render(<NoFlightsCard title="Your badges" text="Earn them." />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Your badges" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Kilometres")).toBeNull();
  });

  it("opens the add-flight form on the tab each option names", () => {
    render(<NoFlightsCard welcome />);
    fireEvent.click(screen.getByRole("button", { name: /Describe your trip/ }));
    fireEvent.click(screen.getByRole("button", { name: /Fill in a form/ }));
    fireEvent.click(screen.getByRole("button", { name: /Upload a CSV file/ }));
    expect(setAddFlightOpened.mock.calls).toEqual([
      [true, "ai"],
      [true, "manual"],
      [true, "csv"],
    ]);
  });
});
