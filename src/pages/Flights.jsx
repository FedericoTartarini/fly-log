import React from "react";
import { Container, Title, Stack, Card, Grid, Image } from "@mantine/core";
import FlightYearFilter from "../components/FlightYearFilter";
import flightImg from "../assets/flight.jpg";
import FlightsList from "../components/FlightsList.tsx";

function Flights() {
  return (
    <Container mt="md">
      <Stack spacing="xl">
        <Title order={2} ta="center">
          Detailed Flight Statistics
        </Title>

        <Card shadow="sm" radius="md" withBorder>
          <Card.Section>
            <Image src={flightImg} height={160} alt="plane wing" />
          </Card.Section>

          <FlightYearFilter />
        </Card>

        <FlightsList />
      </Stack>
    </Container>
  );
}

export default Flights;
