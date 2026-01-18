import React, { useEffect } from "react";
import { Container, Title, Stack, Card, Image } from "@mantine/core";
import FlightYearFilter from "../components/FlightYearFilter";
import flightImg from "../assets/flight.jpg";
import FlightsList from "../components/FlightsList.tsx";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store.ts";
import FlightsTopBar from "../components/FlightsTopBar.jsx";

function Flights() {
  const { t } = useTranslation("flights");
  const fetchFlights = useFlightStore((state) => state.fetchFlights);
  const allFlights = useFlightStore((state) => state.allFlights);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  // If there are no flights, simply show the shared top bar (it will display the empty state and add button)
  if (!allFlights || allFlights.length === 0) {
    return (
      <Container mt="md">
        <Stack spacing="xl">
          <Title order={2} ta="center">
            {t("title")}
          </Title>

          <FlightsTopBar fullWidth={true} />
        </Stack>
      </Container>
    );
  }

  return (
    <Container mt="md">
      <Stack spacing="xl">
        <Title order={2} ta="center">
          {t("title")}
        </Title>

        <Card shadow="sm" radius="md" withBorder>
          <Card.Section>
            <Image src={flightImg} height={160} alt={t("image_alt")} />
          </Card.Section>

          <FlightYearFilter />
        </Card>

        <FlightsTopBar fullWidth={false} />

        <FlightsList />
      </Stack>
    </Container>
  );
}

export default Flights;
