import React, { lazy, Suspense } from "react";
import {
  Container,
  Title,
  Stack,
  Card,
  Image,
  Center,
  Loader,
} from "@mantine/core";
import flightImg from "../assets/flight.webp";
import flightImg380 from "../assets/flight-380.webp";
import flightImg760 from "../assets/flight-760.webp";
import flightImg1200 from "../assets/flight-1200.webp";
import flightImg1800 from "../assets/flight-1800.webp";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store.ts";
import FlightFilters from "../components/FlightFilters.tsx";

const FlightsList = lazy(() => import("../components/FlightsList.tsx"));
const FlightsTopBar = lazy(() => import("../components/FlightsTopBar.jsx"));

// Flights table page with filters and entry CTA.
function Flights() {
  const { t } = useTranslation("flights");
  const allFlights = useFlightStore((state) => state.allFlights);
  const isLoading = useFlightStore((state) => state.isLoading);

  // If loading, show loading indicator.
  if (isLoading) {
    return (
      <Container mt="md">
        <Stack gap="xl">
          <Title order={2} ta="center">
            {t("title")}
          </Title>
          <Center>
            <Loader color="blue" aria-label={t("loading")} />
          </Center>
        </Stack>
      </Container>
    );
  }

  // If there are no flights, show the shared top bar (empty state + add button).
  if (!allFlights || allFlights.length === 0) {
    return (
      <Container mt="md">
        <Stack spacing="xl">
          <Title order={2} ta="center">
            {t("title")}
          </Title>

          <Suspense
            fallback={
              <Center>
                <Loader color="blue" aria-label={t("loading")} />
              </Center>
            }
          >
            <FlightsTopBar fullWidth={true} />
          </Suspense>
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
          <Card.Section mb="md">
            <Image
              src={flightImg}
              srcSet={`${flightImg380} 380w, ${flightImg760} 760w, ${flightImg1200} 1200w, ${flightImg1800} 1800w`}
              sizes="(max-width: 900px) 90vw, (max-width: 1400px) 1200px, 1800px"
              height={160}
              alt={t("image_alt")}
            />
          </Card.Section>

          <FlightFilters />
        </Card>

        <Suspense
          fallback={
            <Center>
              <Loader color="blue" aria-label={t("loading")} />
            </Center>
          }
        >
          <FlightsTopBar fullWidth={false} />
        </Suspense>

        <Suspense
          fallback={
            <Center>
              <Loader color="blue" aria-label={t("loading")} />
            </Center>
          }
        >
          <FlightsList />
        </Suspense>
      </Stack>
    </Container>
  );
}

export default Flights;
