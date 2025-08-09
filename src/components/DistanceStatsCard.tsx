import React from "react";
import { Card, Title, Grid, Stack, Group, Text } from "@mantine/core";
import StatDisplay from "./StatDisplay";

interface DistanceStatsCardProps {
  totalDistance: number;
  totalFlights: number;
}

interface ChartDataItem {
  destination: string;
  percentage: number;
  actual: number;
  label: string;
}

const EARTH_CIRCUMFERENCE = 40075;
const DISTANCE_TO_MOON = 384400;
const DISTANCE_TO_MARS = 227_940_000;

const DistanceStatsCard: React.FC<DistanceStatsCardProps> = ({
  totalDistance,
  totalFlights,
}) => {
  const averageDistance = totalFlights > 0 ? totalDistance / totalFlights : 0;

  const earthMultiples = totalDistance / EARTH_CIRCUMFERENCE;
  const moonProgress = totalDistance / DISTANCE_TO_MOON;
  const marsProgress = totalDistance / DISTANCE_TO_MARS;

  const chartData: ChartDataItem[] = [
    {
      destination: "🌍 Earth",
      percentage: Math.min((earthMultiples % 1) * 100, 100),
      actual: earthMultiples,
      label: `${earthMultiples.toFixed(1)}x around Earth`,
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
          <Grid.Col span={{ base: 6 }}>
            <StatDisplay
              value={Math.round(totalDistance).toLocaleString()}
              label="Total Distance (km)"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6 }}>
            <StatDisplay
              value={Math.round(averageDistance).toLocaleString()}
              label="Mean Distance (km)"
            />
          </Grid.Col>
        </Grid>
        <Stack gap="xs">
          <Title order={4}>Journey to Space</Title>
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
