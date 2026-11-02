import React, { lazy, Suspense } from "react";
import { Container, Title, Stack, Center, Loader } from "@mantine/core";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store.ts";
import FlightsListSkeleton from "../components/FlightsListSkeleton.jsx";

const FlightsList = lazy(() => import("../components/FlightsList.tsx"));
const NoFlightsCard = lazy(() => import("../components/NoFlightsCard.jsx"));

// Flights table page. The header's filter button narrows the list.
function Flights() {
  const { t } = useTranslation("flights");
  const allFlights = useFlightStore((state) => state.allFlights);
  const isLoading = useFlightStore((state) => state.isLoading);

  // If loading, show the list-shaped skeleton.
  if (isLoading) {
    return <FlightsListSkeleton />;
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
            <NoFlightsCard />
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
