import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import AppearanceControl from "./AppearanceControl";
import { resolver, tokens } from "../theme.js";

describe("AppearanceControl", () => {
  it("hands the chosen scheme to the manager that stores it", async () => {
    // Stands in for Mantine's localStorage manager, which jsdom here cannot
    // back with a working localStorage.
    const manager = {
      get: () => "auto",
      set: vi.fn(),
      subscribe: () => {},
      unsubscribe: () => {},
      clear: () => {},
    };
    render(
      <MantineProvider defaultColorScheme="auto" colorSchemeManager={manager}>
        <AppearanceControl />
      </MantineProvider>,
    );
    expect(screen.getByLabelText("System")).toBeChecked();

    await userEvent.click(screen.getByText("Dark"));

    expect(manager.set).toHaveBeenCalledWith("dark");
    expect(document.documentElement).toHaveAttribute(
      "data-mantine-color-scheme",
      "dark",
    );
  });
});

describe("theme resolver", () => {
  it("gives every token its light and its dark value", () => {
    const { light, dark } = resolver();
    for (const [name, value] of Object.entries(tokens.light)) {
      expect(light[`--fl-${name}`]).toBe(value);
      expect(dark[`--fl-${name}`]).toBe(tokens.dark[name]);
    }
    expect(Object.keys(tokens.dark)).toEqual(Object.keys(tokens.light));
  });
});
