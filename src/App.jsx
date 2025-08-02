import "@mantine/core/styles.css";

import {
  createTheme,
  MantineProvider,
  Title,
  ColorSchemeScript,
} from "@mantine/core";

import "./App.css";
import { ApplicationShell } from "./pages/ApplicationShell.jsx";

const theme = createTheme({
  headings: {
    fontFamily: "Roboto, sans-serif",
  },
});

function App() {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="auto" />
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <ApplicationShell />
      </MantineProvider>
    </>
  );
}

export default App;
