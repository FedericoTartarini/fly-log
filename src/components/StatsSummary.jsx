import React from "react";
import { Card, Grid, Image, Button, Stack, SimpleGrid } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useFlightStats } from "../hooks/useFlightStats.js";
import useFlightStore from "../store.ts";
import flightImg from "../assets/flight.webp";
import flightImg380 from "../assets/flight-380.webp";
import flightImg760 from "../assets/flight-760.webp";
import flightImg1200 from "../assets/flight-1200.webp";
import flightImg1800 from "../assets/flight-1800.webp";
import { PATHS, IDS } from "../constants/MyClasses.ts";
import StatDisplay from "./StatDisplay";
import { useTranslation } from "react-i18next";

// Summary cards for key stats and CTA shortcuts.
function StatsSummary() {
  const filteredFlights = useFlightStore((s) => s.filteredFlights);
  const navigate = useNavigate();
  const { t } = useTranslation("flights");

  // Use the enhanced flight stats with our enriched flight data
  const stats = useFlightStats(filteredFlights);

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Card.Section>
        <Image
          src={flightImg}
          srcSet={`${flightImg380} 380w, ${flightImg760} 760w, ${flightImg1200} 1200w, ${flightImg1800} 1800w`}
          sizes="(max-width: 900px) 90vw, (max-width: 1400px) 1200px, 1800px"
          height={120}
          alt={t("image_alt")}
        />
      </Card.Section>

      <Stack mt="lg">
        <Grid>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={filteredFlights.length}
              label={t("stats.total_flights")}
              id={IDS.STATS.TOTAL_FLIGHTS}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={Math.round(stats.totalDistance).toLocaleString()}
              label={t("stats.distance_km")}
              id={IDS.STATS.TOTAL_DISTANCE}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={(stats.totalFlightTime / 24).toFixed(1)}
              label={t("stats.flight_time_days")}
              id={IDS.STATS.TOTAL_TIME}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={stats.airports}
              label={t("stats.airports_visited")}
              id={IDS.STATS.AIRPORTS_VISITED}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={stats.airlines}
              label={t("stats.airlines_flown")}
              id={IDS.STATS.AIRLINES_FLOWN}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={stats.countries}
              label={t("stats.countries_visited")}
              id={IDS.STATS.COUNTRIES_VISITED}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={stats.internationalFlights}
              label={t("stats.international_flights")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={stats.longHaulFlights}
              label={t("stats.long_haul_flights")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, xs: 4 }}>
            <StatDisplay
              value={stats.westBoundFlights}
              label={t("stats.west_bound_flights")}
            />
          </Grid.Col>
        </Grid>

        <SimpleGrid justify="center" mt="md" cols={2}>
          <Button
            variant="light"
            onClick={() => navigate(PATHS.FLIGHTS)}
            data-cy="view-flights-btn"
          >
            {t("stats.view_flights")}
          </Button>
          <Button
            variant="light"
            color="accent"
            onClick={() => navigate(PATHS.TOUR)}
            data-cy="view-tour-btn"
          >
            {t("stats.view_tour")}
          </Button>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

export default StatsSummary;
