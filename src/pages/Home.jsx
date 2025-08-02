import React from "react";
import WorldMap from "../components/WorldMap.jsx";
import { Stack, Title } from "@mantine/core";
import StatsSummary from "../components/StatsSummary.jsx";

const Home = () => {
  return (
    <>
      <Stack
        bg="var(--mantine-color-body)"
        align="stretch"
        justify="center"
        gap="md"
      >
        <div style={{ position: "relative", zIndex: 0 }}>
          <WorldMap />
        </div>
        <StatsSummary />
      </Stack>
    </>
  );
};

export default Home;
