import "./App.css";
import WorldMap from "./components/WorldMap.jsx";
import StatsSummary from "./components/StatsSummary.jsx";

function App() {
  return (
    <>
      <h1>Flight Tracker</h1>
      <StatsSummary />
      <WorldMap />
    </>
  );
}

export default App;
