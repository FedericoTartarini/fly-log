import React, { useEffect, useState } from "react";
import WorldMap from "../components/WorldMap.jsx";
import {
  Title,
  Stack,
  Card,
  Grid,
  SegmentedControl,
  Paper,
  Container,
  Loader,
  Text,
  Button,
  Modal,
  Center,
} from "@mantine/core";
import StatsSummary from "../components/StatsSummary.jsx";
import useFlightStore from "../store.ts";
import { BarChart } from "@mantine/charts";
import FlightCard from "../components/FlightCard.tsx";
import DistanceStatsCard from "../components/DistanceStatsCard.js";
import {
  getDeparturesByCountry,
  getFlightsByTimeGrouping,
} from "../utils/chartUtils.js";
import { useFlightStats } from "../hooks/useFlightStats.js";
import FlightEntryForm from "../components/FlightEntryForm.tsx";
import NoFlightsCard from "../components/NoFlightsCard.jsx";

const FlightsStats = () => {
  const { filteredFlights, isLoading, error, fetchFlights, allFlights } =
    useFlightStore();
  const [formOpened, setFormOpened] = useState(false);
  const [timeGrouping, setTimeGrouping] = useState("dayOfWeek");

  // Move the stats calculation here to avoid conditional hook calls
  const stats = useFlightStats(filteredFlights);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  const handleFlightSaved = () => {
    setFormOpened(false);
    fetchFlights(); // Refresh data after saving a new flight
  };

  // Prepare chart data outside of the conditional rendering
  const chartData = getDeparturesByCountry(filteredFlights);
  const timeChartData = getFlightsByTimeGrouping(filteredFlights, timeGrouping);

  if (isLoading) {
    return (
      <Container size="lg" mt="md">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" mt="md">
        <Text c="red" size="lg" ta="center">
          Error loading flight data: {error}
        </Text>
      </Container>
    );
  }

  if (allFlights.length === 0) {
    return (
      <>
        <Modal
          opened={formOpened}
          onClose={() => setFormOpened(false)}
          title="Add New Flight"
          size="lg"
        >
          <FlightEntryForm onSaved={handleFlightSaved} />
        </Modal>

        {allFlights.length === 0 && (
          <NoFlightsCard setFormOpened={setFormOpened} />
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 0 }}>
        <WorldMap />
      </div>

      {/* This Stack will scroll over the map */}
      <Paper radius="lg" pt="xs" style={{ position: "relative", zIndex: 1 }}>
        <Stack
          bg="var(--mantine-color-body)"
          gap="md"
          px="md"
          style={{ position: "relative", zIndex: 1 }}
        >
          <StatsSummary />

          {/* Add button to open modal */}
          <Button onClick={() => setFormOpened(true)} fullWidth>
            Add New Flight
          </Button>

          <Modal
            opened={formOpened}
            onClose={() => setFormOpened(false)}
            title="Add New Flight"
            size="lg"
          >
            <FlightEntryForm onSaved={handleFlightSaved} />
          </Modal>

          <DistanceStatsCard
            totalDistance={stats.totalDistance}
            totalFlights={filteredFlights.length}
          />

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <FlightCard
                flight={stats.shortestFlight}
                title="Shortest Flight"
                color="orange"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <FlightCard
                flight={stats.longestFlight}
                title="Longest Flight"
                color="teal"
              />
            </Grid.Col>
          </Grid>

          <Card shadow="sm" radius="md" withBorder>
            <Title order={3} mb="md">
              Departures by Country
            </Title>
            <BarChart
              h={(chartData.length + 1) * 28}
              data={chartData}
              dataKey="country"
              orientation="vertical"
              yAxisProps={{
                width: 60,
              }}
              xAxisProps={{
                tickFormatter: (v) => (Number.isInteger(v) ? v : ""),
              }}
              barProps={{ radius: 8 }}
              series={[{ name: "departures", color: "blue.6" }]}
            />
          </Card>

          <Card shadow="sm" radius="md" withBorder>
            <Stack mb="md">
              <Title order={3}>
                Flights by{" "}
                {timeGrouping === "dayOfWeek"
                  ? "Day of Week"
                  : timeGrouping === "year"
                    ? "Year"
                    : "Month"}
              </Title>
              <SegmentedControl
                value={timeGrouping}
                onChange={setTimeGrouping}
                data={[
                  { label: "Day of Week", value: "dayOfWeek" },
                  { label: "Year", value: "year" },
                  { label: "Month", value: "month" },
                ]}
              />
            </Stack>
            <BarChart
              h={(timeChartData.length + 1) * 28}
              data={timeChartData}
              dataKey="period"
              orientation="vertical"
              yAxisProps={{
                width: 84,
              }}
              xAxisProps={{
                tickFormatter: (v) => (Number.isInteger(v) ? v : ""),
              }}
              barProps={{ radius: 8 }}
              series={[{ name: "flights", color: "green.6" }]}
            />
          </Card>
        </Stack>
      </Paper>
    </>
  );
};

export default FlightsStats;
