import React from "react";
import { Card, Title, Grid, Stack, Group, Text } from "@mantine/core";
import StatDisplay from "./StatDisplay";

const DistanceStatsCard = ({ totalDistance, totalFlights }) => {
  const averageDistance = totalFlights > 0 ? totalDistance / totalFlights : 0;

  // Distance constants in km
  const EARTH_CIRCUMFERENCE = 40075;
  const DISTANCE_TO_MOON = 384400;
  const DISTANCE_TO_MARS = 227940000;

  // Calculate actual multiples and percentages
  const earthMultiples = totalDistance / EARTH_CIRCUMFERENCE;
  const moonProgress = totalDistance / DISTANCE_TO_MOON;
  const marsProgress = totalDistance / DISTANCE_TO_MARS;

  const chartData = [
    {
      destination: "🌍 Earth",
      percentage: Math.min((earthMultiples % 1) * 100, 100),
      actual: earthMultiples,
      label: `${(moonProgress * 100).toFixed(1)}x around Earth`,
    },
    {
      destination: "🌙 Moon",
      percentage: Math.min(moonProgress * 100, 100),
      actual: moonProgress,
      label: `${(moonProgress * 100).toFixed(1)}% to Moon`,
    },
    {
      destination: "🚀 Mars",
      percentage: Math.min(marsProgress * 100, 100),
      actual: marsProgress,
      label: `${(marsProgress * 100).toFixed(3)}% to Mars`,
    },
  ];

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack gap="md">
        <Title order={3}>Distance Statistics</Title>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <StatDisplay
              value={Math.round(totalDistance).toLocaleString()}
              label="Total Distance (km)"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <StatDisplay
              value={Math.round(averageDistance).toLocaleString()}
              label="Average Distance (km)"
            />
          </Grid.Col>
        </Grid>

        <Stack gap="xs">
          <Title order={4}>Journey to Space</Title>

          {/* Progress indicators */}
          <Stack gap="xs" mb="md">
            {chartData.map((item) => (
              <Group key={item.destination} justify="space-between">
                <Text size="sm">{item.destination}</Text>
                <Text size="sm" c="dimmed">
                  {item.label}
                </Text>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
};

export default DistanceStatsCard;
