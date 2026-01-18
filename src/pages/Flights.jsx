import React, { useEffect } from "react";
import { Container, Title, Stack, Card, Image } from "@mantine/core";
import FlightYearFilter from "../components/FlightYearFilter";
import flightImg from "../assets/flight.jpg";
import FlightsList from "../components/FlightsList.tsx";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store.ts";

function Flights() {
  const { t } = useTranslation("flights");
  const fetchFlights = useFlightStore((state) => state.fetchFlights);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

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

        <FlightsList />
      </Stack>
    </Container>
  );
}

export default Flights;
