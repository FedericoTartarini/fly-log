import React, { lazy, Suspense, useMemo, useState } from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  SimpleGrid,
  Divider,
  Group,
  SegmentedControl,
  Center,
  Loader,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store.ts";
import {
  evaluateBadges,
  sortForShelf,
  BADGE_CATEGORIES,
} from "../utils/badges.ts";
import BadgeTile from "../components/BadgeTile.jsx";
import { BADGE_STYLES } from "../constants/badgeIcons.ts";
import PageSkeleton from "../components/PageSkeleton.jsx";

const FlightsTopBar = lazy(() => import("../components/FlightsTopBar.jsx"));

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

  // Two looks over the same badges; the choice is cosmetic and per-session.
  const [styleName, setStyleName] = useState(BADGE_STYLES.PASS);

  // Grouped by category, and sorted within each group the same way the shelf
  // always was: earned first, newest first, then the nearest one still locked.
  const sections = useMemo(() => {
    const badges = evaluateBadges(allFlights);
    return Object.values(BADGE_CATEGORIES).map((category) => ({
      category,
      badges: sortForShelf(badges.filter((b) => b.category === category)),
    }));
  }, [allFlights]);

  const badges = useMemo(
    () => sections.flatMap((section) => section.badges),
    [sections],
  );

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <Container size="lg" mt="md">
        <Text c="red" size="lg" ta="center">
          {error}
        </Text>
      </Container>
    );
  }

  // No flights at all: show the shared add-flight call to action, as Timeline does.
  if (!allFlights || allFlights.length === 0) {
    return (
      <Container mt="md">
        <Stack gap="xl">
          <Title order={2} ta="center">
            {t("badges.title")}
          </Title>
          <Suspense
            fallback={
              <Center>
                <Loader aria-label={t("loading")} />
              </Center>
            }
          >
            <FlightsTopBar fullWidth={true} />
          </Suspense>
        </Stack>
      </Container>
    );
  }

  const unlocked = badges.filter((badge) => badge.unlocked);

  return (
    <Container size="lg" my="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Title order={2}>{t("badges.title")}</Title>
            <Text c="dimmed">
              {t("badges.collected", {
                count: unlocked.length,
                total: badges.length,
              })}
            </Text>
          </Stack>
          <SegmentedControl
            size="xs"
            value={styleName}
            onChange={setStyleName}
            data={[
              { value: BADGE_STYLES.PASS, label: t("badges.style.pass") },
              { value: BADGE_STYLES.STAMP, label: t("badges.style.stamp") },
            ]}
          />
        </Group>

        {sections.map(({ category, badges: items }) => (
          <Stack key={category} gap="sm">
            <Divider
              labelPosition="left"
              label={
                <Group gap="xs">
                  <Text fw={700} size="sm" tt="uppercase">
                    {t(`badges.categories.${category}`)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t("badges.section_count", {
                      unlocked: items.filter((b) => b.unlocked).length,
                      total: items.length,
                    })}
                  </Text>
                </Group>
              }
            />
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
              {items.map((badge) => (
                <BadgeTile key={badge.id} badge={badge} styleName={styleName} />
              ))}
            </SimpleGrid>
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}

export default Badges;
