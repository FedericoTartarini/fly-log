import React, { useEffect } from "react";
import WorldMap from "../components/WorldMap.jsx";
import { Stack, Title } from "@mantine/core";
import StatsSummary from "../components/StatsSummary.jsx";
import useFlightStore from "../store.js";

const Home = () => {
  const { userName, setUserName } = useFlightStore();

  useEffect(() => {
    // Set the user name from context when the component mounts
    setUserName("Federico");
  }, [setUserName]);

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 0 }}>
        <WorldMap />
      </div>

      {/* This Stack will scroll over the map */}
      <Stack
        bg="var(--mantine-color-body)"
        align="center"
        justify="center"
        gap="md"
        px="md"
        style={{ position: "relative", zIndex: 1 }}
      >
        <Title order={4} align="center" mt="md">
          {userName ? `Welcome ${userName}` : "Welcome to My Flight Tracker"}
        </Title>
        <StatsSummary />
      </Stack>
    </>
  );
};

export default Home;
