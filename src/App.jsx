import "@mantine/core/styles.css";

import {
  createTheme,
  MantineProvider,
  Title,
  ColorSchemeScript,
} from "@mantine/core";

import "./App.css";
import WorldMap from "./components/WorldMap.jsx";
import StatsSummary from "./components/StatsSummary.jsx";

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
        <Title>Flight Tracker</Title>
        <StatsSummary />
        <WorldMap />
      </MantineProvider>
    </>
  );
}

export default App;
