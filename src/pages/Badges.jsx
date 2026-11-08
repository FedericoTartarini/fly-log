import React, { lazy, Suspense, useMemo } from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Center,
  Loader,
  SimpleGrid,
} from "@mantine/core";
import { IconMedal } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store.ts";
import {
  evaluateBadges,
  sortForShelf,
  pickClosestNext,
  formatBadgeProgress,
  BADGE_CATEGORIES,
  DISTANCE_BADGES,
} from "../utils/badges.ts";
import { BADGE_ICONS } from "../constants/badgeIcons.ts";
import BadgeTile from "../components/BadgeTile.jsx";
import BadgesSkeleton from "../components/BadgesSkeleton.jsx";
import classes from "./Badges.module.css";

const NoFlightsCard = lazy(() => import("../components/NoFlightsCard.jsx"));

// The locked badge nearest to done, with how far there is still to go.
const ClosestNext = ({ badge }) => {
  const { t, i18n } = useTranslation("flights");
  const Icon = BADGE_ICONS[badge.id] ?? IconMedal;
  const name = t(`badges.items.${badge.id}.name`);
  const remaining = Math.round(badge.target - badge.current);

  return (
    <section className={classes.next} aria-labelledby="badges-next">
      <span className={classes.nextIcon} aria-hidden="true">
        <Icon size={22} stroke={1.8} />
      </span>
      <h2 id="badges-next" className={classes.label}>
        {t("badges.closest_next")}
      </h2>
      <p className={classes.nextName} data-cy="badges-next">
        {name}{" "}
        <span className={classes.muted}>
          ·{" "}
          {t(
            DISTANCE_BADGES.has(badge.id) ? "badges.to_go_km" : "badges.to_go",
            {
              value: remaining.toLocaleString(i18n.language),
              count: remaining,
            },
          )}
        </span>
      </p>
      <div className={classes.nextProgress}>
        <div
          role="progressbar"
          aria-label={t("badges.progress_label", { name })}
          aria-valuemin={0}
          aria-valuemax={badge.target}
          aria-valuenow={badge.current}
          className={classes.track}
        >
          <div
            className={classes.fill}
            style={{ width: `${(badge.current / badge.target) * 100}%` }}
          />
        </div>
        {formatBadgeProgress(badge, i18n.language)}
      </div>
    </section>
  );
};

// Badges are lifetime facts, so this page reads the full history and ignores
// the shared year filter. Timeline does the same, for the same reason.
function Badges() {
  const { allFlights, isLoading, error } = useFlightStore(
    useShallow((s) => ({
      allFlights: s.allFlights,
      isLoading: s.isLoading,
      error: s.error,
    })),
  );
  const { t } = useTranslation("flights");

  const badges = useMemo(() => evaluateBadges(allFlights), [allFlights]);
  // Grouped by category, and sorted within each group the same way the shelf
  // always was: earned first, newest first, then the nearest one still locked.
  const sections = useMemo(
    () =>
      Object.values(BADGE_CATEGORIES).map((category) => ({
        category,
        badges: sortForShelf(badges.filter((b) => b.category === category)),
      })),
    [badges],
  );

  if (isLoading) return <BadgesSkeleton />;

  if (error) {
    return (
      <Container size="sm" mt="md">
        <Text c="red" size="lg" ta="center" role="alert">
          {error}
        </Text>
      </Container>
    );
  }

  // No flights at all: show the shared add-flight call to action, as Timeline does.
  if (!allFlights || allFlights.length === 0) {
    return (
      <Container size="sm" mt="md" pb={96}>
        <Stack gap="md">
          <Title order={1} fz={28}>
            {t("badges.title")}
          </Title>
          <Suspense
            fallback={
              <Center>
                <Loader aria-label={t("loading")} />
              </Center>
            }
          >
            <NoFlightsCard
              title={t("no_flights_card.badges_title")}
              text={t("no_flights_card.badges_text")}
            />
          </Suspense>
        </Stack>
      </Container>
    );
  }

  const earned = badges.filter((badge) => badge.unlocked).length;
  const collected = t("badges.collected", {
    count: earned,
    total: badges.length,
  });
  const next = pickClosestNext(badges);

  return (
    <Container size="lg" mt="md" pb={96}>
      <Stack gap={20}>
        <Stack gap={10}>
          <div>
            <Title order={1} fz={28}>
              {t("badges.title")}
            </Title>
            <Text c="var(--fl-muted)" mt={2} data-cy="badges-collected">
              {collected}
            </Text>
          </div>
          {/* The text above already says it, so the strip is only a picture. */}
          <div className={classes.ticks} aria-hidden="true">
            {badges.map((badge, i) => (
              <span
                key={badge.id}
                className={classes.tick}
                data-earned={i < earned || undefined}
              />
            ))}
          </div>
        </Stack>

        {next && <ClosestNext badge={next} />}

        {sections.map(({ category, badges: items }) => {
          const title = t(`badges.categories.${category}`);
          const count = t("badges.section_count", {
            unlocked: items.filter((b) => b.unlocked).length,
            total: items.length,
          });
          return (
            <Stack component="section" key={category} gap={8}>
              <h2 className={classes.sectionTitle}>
                {title} <span className={classes.muted}>{count}</span>
              </h2>
              {/* One column on phones; wider screens fill the row instead of
                  leaving white space beside one long column. */}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={8}>
                {items.map((badge) => (
                  <BadgeTile key={badge.id} badge={badge} />
                ))}
              </SimpleGrid>
            </Stack>
          );
        })}
      </Stack>
    </Container>
  );
}

export default Badges;
