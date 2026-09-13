import React, { useMemo } from "react";
import {
  Card,
  Group,
  Text,
  ThemeIcon,
  Stack,
  Anchor,
  SimpleGrid,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IconChevronRight, IconMedal } from "@tabler/icons-react";
import useFlightStore from "../store.ts";
import {
  evaluateBadges,
  sortForShelf,
  pickStripBadges,
  DISTANCE_BADGES,
} from "../utils/badges.ts";
import { BADGE_ICONS } from "../constants/badgeIcons.ts";
import { PATHS } from "../constants/MyClasses.ts";
import { formatCalendarDate } from "../utils/dateUtils";

// Two recent unlocks and the one you are closest to. Kept to three so the card
// stays one row on a phone and does not push the charts below out of view.
const RECENT_SHOWN = 2;

// One badge in the strip. The whole tile is the link: tapping a badge and
// getting nothing is the reason this is a button and not a bare row.
const StripItem = ({ badge, caption, dimmed, onOpen }) => {
  const { t } = useTranslation("flights");
  const Icon = BADGE_ICONS[badge.id] ?? IconMedal;
  return (
    <UnstyledButton
      onClick={onOpen}
      data-cy={`strip-badge-${badge.id}`}
      aria-label={t(`badges.items.${badge.id}.name`)}
    >
      <Group gap="xs" wrap="nowrap" align="flex-start">
        {/* Sized to the three stacked lines beside it — name, criterion, date —
            so the icon squares off against the text block. */}
        <ThemeIcon
          variant="light"
          size={48}
          radius="md"
          color={dimmed ? "gray" : "primary"}
        >
          <Icon size={26} stroke={1.6} />
        </ThemeIcon>
        <Stack gap={0}>
          <Text size="sm" fw={600} lh={1.2} c={dimmed ? "dimmed" : undefined}>
            {t(`badges.items.${badge.id}.name`)}
          </Text>
          {/* The criterion, not just the date: a name alone means nothing to
              someone seeing the badge for the first time. */}
          <Text size="xs" c="dimmed" lh={1.3}>
            {t(`badges.items.${badge.id}.criterion`)}
          </Text>
          <Text size="xs" c={dimmed ? "dimmed" : "primary.7"} fw={500}>
            {caption}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
};

/**
 * The badge page's advert on the stats dashboard: what you last earned, and the
 * one you are closest to earning. Reads the full history, never the year filter.
 */
function BadgeStrip() {
  const allFlights = useFlightStore((s) => s.allFlights);
  const { t, i18n } = useTranslation("flights");
  const navigate = useNavigate();

  const badges = useMemo(
    () => sortForShelf(evaluateBadges(allFlights)),
    [allFlights],
  );

  const openShelf = () => navigate(PATHS.BADGES);

  const shown = pickStripBadges(badges, RECENT_SHOWN);
  const next = shown.find((b) => !b.unlocked);
  const recent = shown.filter((b) => b.unlocked);

  // Nothing earned and nothing in progress means an empty account; the stats
  // page already has a call to action for that.
  if (recent.length === 0 && !next) return null;

  const remaining = next
    ? Math.round(next.target - next.current).toLocaleString(i18n.language)
    : null;

  return (
    <Card shadow="sm" radius="md" withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={700} size="sm" tt="uppercase" c="dimmed">
            {t("badges.title")}
          </Text>
          <Anchor
            component="button"
            type="button"
            size="sm"
            onClick={openShelf}
            data-cy="view-badges-link"
          >
            <Group gap={2} wrap="nowrap">
              {t("badges.view_all")}
              <IconChevronRight size={14} />
            </Group>
          </Anchor>
        </Group>

        {/* A grid rather than a wrapping row: three items wrapping to a second
            line left a ragged gap on a phone. */}
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md" verticalSpacing="sm">
          {recent.map((badge) => (
            <StripItem
              key={badge.id}
              badge={badge}
              onOpen={openShelf}
              caption={formatCalendarDate(
                badge.unlockedOn,
                "DD MMM YYYY",
                i18n.language,
              )}
            />
          ))}
          {next && (
            <StripItem
              badge={next}
              dimmed
              onOpen={openShelf}
              caption={t(
                DISTANCE_BADGES.has(next.id)
                  ? "badges.to_go_km"
                  : "badges.to_go",
                { value: remaining },
              )}
            />
          )}
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

export default BadgeStrip;
