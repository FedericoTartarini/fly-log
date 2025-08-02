import React from "react";
import flightsData from "../../python/flights_with_coordinates.json";
import useFlightStore from "../store";
import {
  NativeSelect,
  Card,
  Image,
  Text,
  Badge,
  Space,
  Button,
  Grid,
  Group,
  Stack,
  Title,
  Center,
} from "@mantine/core";

const StatsSummary = () => {
  const { selectedYear, setSelectedYear } = useFlightStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison

  // Filter out future flights
  const pastFlights = flightsData.filter(
    (flight) => new Date(flight.Date) <= today,
  );

  // Get unique years from past flights for the dropdown
  const years = [
    ...new Set(
      pastFlights.map((flight) => new Date(flight.Date).getFullYear()),
    ),
  ].sort((a, b) => b - a); // Sort years in descending order

  // Filter flights based on the selected year
  const filteredFlights =
    selectedYear === "all"
      ? pastFlights
      : pastFlights.filter(
          (flight) =>
            new Date(flight.Date).getFullYear().toString() === selectedYear,
        );

  // Calculate total distance and flight time
  const { totalDistance, totalFlightTime } = filteredFlights.reduce(
    (acc, flight) => {
      acc.totalDistance += flight.distance_km || 0;
      acc.totalFlightTime += flight.flight_time || 0;
      return acc;
    },
    { totalDistance: 0, totalFlightTime: 0 },
  );

  // Calculate unique airports and airlines
  const airports = new Set();
  const airlines = new Set();

  filteredFlights.forEach((flight) => {
    if (flight.From) airports.add(flight.From);
    if (flight.To) airports.add(flight.To);
    if (flight.Airline) airlines.add(flight.Airline);
  });

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section>
          <Image src="src/assets/flight.jpg" height={120} alt="plane wing" />
        </Card.Section>

        <NativeSelect
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          mt="md"
          mb="xs"
        >
          <option value="all">All Stats</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </NativeSelect>

        <Grid>
          <Grid.Col span={4}>
            <Stack align="center" justify="center" gap="xs">
              <Title>{filteredFlights.length}</Title>
              <Text>Total Flights</Text>
            </Stack>
          </Grid.Col>
          <Grid.Col span={4}>2</Grid.Col>
          <Grid.Col span={4}>3</Grid.Col>
        </Grid>

        <Group justify="space-between" mt="md" mb="xs">
          <Text fw={500}>Total Flights: {filteredFlights.length}</Text>
        </Group>
      </Card>
    </>
    // <div style={cardStyle}>

    //   <div style={summaryStyle}>
    //     <div style={statItemStyle}>
    //       <div style={statValueStyle}>{filteredFlights.length}</div>
    //       <div style={statLabelStyle}>Total Flights</div>
    //     </div>
    //     <div style={statItemStyle}>
    //       <div style={statValueStyle}>
    //         {Math.round(totalDistance).toLocaleString()}
    //       </div>
    //       <div style={statLabelStyle}>Total Distance (km)</div>
    //     </div>
    //     <div style={statItemStyle}>
    //       <div style={statValueStyle}>{(totalFlightTime / 24).toFixed(1)}</div>
    //       <div style={statLabelStyle}>Total Flight Time (days)</div>
    //     </div>
    //     <div style={statItemStyle}>
    //       <div style={statValueStyle}>{airports.size}</div>
    //       <div style={statLabelStyle}>Airports Visited</div>
    //     </div>
    //     <div style={statItemStyle}>
    //       <div style={statValueStyle}>{airlines.size}</div>
    //       <div style={statLabelStyle}>Airlines Flown</div>
    //     </div>
    //   </div>
    // </div>
  );
};

export default StatsSummary;
