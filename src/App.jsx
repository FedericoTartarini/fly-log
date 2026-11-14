import React, { Suspense } from "react";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme, resolver } from "./theme.js";
import AuthProvider from "./context/AuthContext";
import PageSkeleton from "./components/PageSkeleton.jsx";

// Providers around the router. The browser (main.jsx) and the build-time
// render of "/" (entry-server.jsx) must produce the same tree, or hydration
// fails, so both use this one.
export default function App({ children }) {
  return (
    <React.StrictMode>
      <ColorSchemeScript defaultColorScheme="auto" />
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        cssVariablesResolver={resolver}
      >
        {/* Above every modal, so validation errors show over the form */}
        <Notifications zIndex={2000} />
        <AuthProvider>
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </AuthProvider>
      </MantineProvider>
    </React.StrictMode>
  );
}
