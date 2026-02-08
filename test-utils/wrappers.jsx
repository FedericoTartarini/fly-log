// filepath: test-utils/wrappers.jsx
import React from "react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";

// Returns a wrapper component that composes MantineProvider + MemoryRouter
export function makeRouterWrapper({ initialEntries = ["/"] } = {}) {
  return function Wrapper({ children }) {
    return (
      <MantineProvider env="test">
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </MantineProvider>
    );
  };
}
