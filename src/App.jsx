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
        {/* AuthProvider inside the Suspense boundary, not around it. React
            adopts the prerendered page in two passes: first the providers
            outside any boundary, then, later, what is inside it. Auth starts
            in an effect, so from out here it could answer between the two
            passes on a slow machine. The header would then draw the Login
            button that the prerendered HTML lacks, and React would throw
            the page away (error #418). In here, auth starts only once the
            header has been adopted. */}
        <Suspense fallback={<PageSkeleton />}>
          <AuthProvider>{children}</AuthProvider>
        </Suspense>
      </MantineProvider>
    </React.StrictMode>
  );
}
