import React, { useEffect } from "react";
import {
  Container,
  Title,
  Stack,
  Card,
  Image,
  Center,
  Loader,
} from "@mantine/core";
import FlightYearFilter from "../components/FlightYearFilter";
import flightImg from "../assets/flight.webp";
import flightImg380 from "../assets/flight-380.webp";
import flightImg760 from "../assets/flight-760.webp";
import FlightsList from "../components/FlightsList.tsx";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store.ts";
import FlightsTopBar from "../components/FlightsTopBar.jsx";

function Flights() {
  const { t } = useTranslation("flights");
  const fetchFlights = useFlightStore((state) => state.fetchFlights);
  const allFlights = useFlightStore((state) => state.allFlights);
  const isLoading = useFlightStore((state) => state.isLoading);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <Container mt="md">
        <Stack gap="xl">
          <Title order={2} ta="center">
            {t("title")}
          </Title>
          <Center>
            <Loader color="blue" />
          </Center>
        </Stack>
      </Container>
    );
  }

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
            <Image
              src={flightImg}
              srcSet={`${flightImg380} 380w, ${flightImg760} 760w, ${flightImg} 1920w`}
              sizes="(max-width: 600px) 380px, (max-width: 1200px) 760px, 1920px"
              height={160}
              alt={t("image_alt")}
            />
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
