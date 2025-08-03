import About from "./About.jsx"; // Default import, no curly braces
import { render } from "../../test-utils/index.js";
import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest"; // Add missing imports

describe("About component", () => {
  it("has correct text", () => {
    render(<About />);
    expect(screen.getByText("About My Flight Tracker")).toBeInTheDocument();
  });
});
