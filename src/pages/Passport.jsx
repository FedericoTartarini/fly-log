import React, { lazy, Suspense, useMemo } from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Center,
  Loader,
  VisuallyHidden,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store.ts";
import { passportStamps, flagEmoji } from "../utils/passport.ts";
import { getCountryName } from "../utils/countryUtils.ts";
import { formatCalendarDate } from "../utils/dateUtils";
import PassportSkeleton from "../components/PassportSkeleton.jsx";
import stampInks from "../assets/stampInks.json";
import classes from "./Passport.module.css";

// The stamp's ink, light and dark, from scripts/build-stamp-inks.mjs. A code
// with no flag keeps the accent set in the CSS.
const stampInkStyle = (country) => {
  const ink = stampInks[country];
  return ink && { "--stamp-ink-light": ink[0], "--stamp-ink-dark": ink[1] };
};

const NoFlightsCard = lazy(() => import("../components/NoFlightsCard.jsx"));

// One stamp per country the user has landed in. Like Badges and Timeline, it
// reads the full history and ignores the shared year filter.
function Passport() {
  const { allFlights, isLoading, error } = useFlightStore(
    useShallow((s) => ({
      allFlights: s.allFlights,
      isLoading: s.isLoading,
      error: s.error,
    })),
  );
  const { t, i18n } = useTranslation("flights");
  const stamps = useMemo(() => passportStamps(allFlights), [allFlights]);

  if (isLoading) return <PassportSkeleton />;

  if (error) {
    return (
      <Container size="sm" mt="md">
        <Text c="red" size="lg" ta="center" role="alert">
          {error}
        </Text>
      </Container>
    );
  }

  const title = (
    <Title order={1} fz={28}>
      {t("passport.title")}
    </Title>
  );

  // No stamps yet, either no flights or only upcoming ones: the shared
  // add-flight call to action, as Badges does.
  if (stamps.length === 0) {
    return (
      <Container size="sm" mt="md" pb={96}>
        <Stack gap="md">
          {title}
          <Suspense
            fallback={
              <Center>
                <Loader aria-label={t("loading")} />
              </Center>
            }
          >
            <NoFlightsCard
              title={t("no_flights_card.passport_title")}
              text={t("no_flights_card.passport_text")}
            />
          </Suspense>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" mt="md" pb={96}>
      <Stack gap={20}>
        <div>
          {title}
          <Text c="var(--fl-muted)" mt={2} data-cy="passport-count">
            {t("passport.countries", { count: stamps.length })}
          </Text>
        </div>
        <ol className={classes.page}>
          {stamps.map((stamp) => (
            <li
              key={stamp.country}
              className={classes.stamp}
              style={stampInkStyle(stamp.country)}
              data-cy={`stamp-${stamp.country}`}
            >
              <span className={classes.code}>
                <span aria-hidden="true">{flagEmoji(stamp.country)}</span>{" "}
                {stamp.country}
              </span>
              <span className={classes.name}>
                {getCountryName(stamp.country)}
              </span>
              <span className={classes.date}>
                <VisuallyHidden>{t("passport.first_arrival")} </VisuallyHidden>
                {formatCalendarDate(
                  stamp.firstArrival,
                  "DD MMM YYYY",
                  i18n.language,
                )}
              </span>
              <span className={classes.visits}>
                {t("passport.visits", { count: stamp.visits })}
              </span>
            </li>
          ))}
        </ol>
      </Stack>
    </Container>
  );
}

export default Passport;
