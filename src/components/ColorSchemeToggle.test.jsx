import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MantineProvider } from "@mantine/core";
import ColorSchemeToggle from "./ColorSchemeToggle";

describe("ColorSchemeToggle", () => {
  it("renders toggle button", () => {
    render(
      <MantineProvider>
        <ColorSchemeToggle />
      </MantineProvider>,
    );
    const button = screen.getByRole("button", { name: /toggle color scheme/i });
    expect(button).toBeInTheDocument();
  });
});
