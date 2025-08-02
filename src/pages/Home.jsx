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
      <Stack
        bg="var(--mantine-color-body)"
        align="stretch"
        justify="center"
        gap="md"
      >
        <div style={{ position: "relative", zIndex: 0 }}>
          <WorldMap />
        </div>
        <Stack align="center" justify="center" gap="md" px="md">
          <Title order={4} align="center">
            {userName ? `Welcome ${userName}` : "Welcome to My Flight Tracker"}
          </Title>
          <StatsSummary />
        </Stack>
      </Stack>
    </>
  );
};

export default Home;
