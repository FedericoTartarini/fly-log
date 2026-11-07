import React, { lazy, Suspense } from "react";
import { Container, Title, Text, Stack, Center, Loader } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store.ts";
import { getYear } from "../utils/dateUtils";
import { getActiveFilters } from "../utils/activeFilters.ts";
import FilterTags from "../components/FilterTags.jsx";
import FlightsListSkeleton from "../components/FlightsListSkeleton.jsx";
import classes from "./Flights.module.css";

const FlightsList = lazy(() => import("../components/FlightsList.tsx"));
const NoFlightsCard = lazy(() => import("../components/NoFlightsCard.jsx"));

// Flights list page. The header's filter button narrows the list, and the
// filter tags under the title show what is on.
function Flights() {
  const { t, i18n } = useTranslation("flights");
  const { allFlights, filteredFlights, filters, isLoading } = useFlightStore(
    useShallow((s) => ({
      allFlights: s.allFlights,
      filteredFlights: s.filteredFlights,
      filters: s.filters,
      isLoading: s.isLoading,
    })),
  );

  if (isLoading) {
    return <FlightsListSkeleton />;
  }

  const hasFlights = allFlights && allFlights.length > 0;
  const years = (allFlights ?? [])
    .map((f) => getYear(f.departure_date))
    .filter(Boolean);
  const number = (value) => value.toLocaleString(i18n.language);
  const countLine = getActiveFilters(filters).length
    ? t("list.count_filtered", {
        count: filteredFlights.length,
        total: number(allFlights.length),
      })
    : t("list.count_all", {
        count: allFlights?.length ?? 0,
        year: years.length ? Math.min(...years) : "",
      });

  const loader = (
    <Center>
      <Loader color="blue" aria-label={t("loading")} />
    </Center>
  );

  return (
    <Container size="sm" mt="md" className={classes.page}>
      <Stack gap="md">
        <div>
          <Title order={1} className={classes.title}>
            {t("title")}
          </Title>
          {hasFlights && (
            <Text c="var(--fl-muted)" mt={2}>
              {countLine}
            </Text>
          )}
        </div>
        <div className={classes.tags}>
          <FilterTags />
        </div>

        <Suspense fallback={loader}>
          {hasFlights ? <FlightsList /> : <NoFlightsCard />}
        </Suspense>
      </Stack>
    </Container>
  );
}

export default Flights;
