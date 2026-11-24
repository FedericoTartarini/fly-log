import React, { useMemo } from "react";
import { Card, Group, Title, Anchor, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IconChevronRight, IconMedal } from "@tabler/icons-react";
import useFlightStore from "../store.ts";
import {
  evaluateBadges,
  sortForShelf,
  pickStripBadges,
} from "../utils/badges.ts";
import { BADGE_ICONS } from "../constants/badgeIcons.ts";
import { PATHS } from "../constants/MyClasses.ts";
import { formatCalendarDate } from "../utils/dateUtils";
import BadgeClosestNext from "./BadgeClosestNext.jsx";
import classes from "./BadgeStrip.module.css";

// Two recent unlocks under the one you are closest to, so the card stays short
// enough not to push the charts below out of view on a phone.
const RECENT_SHOWN = 2;

/**
 * The Badges page's advert on the Stats page: the badge you are closest to
 * earning, with its progress, then the two you earned last. Reads the full
 * history, never the year filter.
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

  return (
    <Card shadow="sm" radius="md" withBorder padding="md" h="100%">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Title order={2} fz={17}>
          {t("badges.title")}
        </Title>
        <Anchor
          component="button"
          type="button"
          size="sm"
          onClick={openShelf}
          data-cy="view-badges-link"
        >
          <Group gap={2} wrap="nowrap">
            {t("badges.collected", {
              count: badges.filter((b) => b.unlocked).length,
              total: badges.length,
            })}
            <IconChevronRight size={14} aria-hidden />
          </Group>
        </Anchor>
      </Group>

      {next && <BadgeClosestNext badge={next} headingOrder={3} />}

      {recent.length > 0 && (
        <section className={classes.latest} aria-labelledby="badges-latest">
          <h3 id="badges-latest" className={classes.label}>
            {t("badges.latest")}
          </h3>
          {recent.map((badge) => {
            const Icon = BADGE_ICONS[badge.id] ?? IconMedal;
            return (
              <UnstyledButton
                key={badge.id}
                className={classes.row}
                onClick={openShelf}
                data-cy={`strip-badge-${badge.id}`}
              >
                <span className={classes.icon} aria-hidden="true">
                  <Icon size={18} stroke={1.8} />
                </span>
                <span className={classes.text}>
                  <span className={classes.name}>
                    {t(`badges.items.${badge.id}.name`)}
                  </span>
                  {/* The criterion, because a name like "Well travelled"
                      does not say it means 25 countries. */}
                  <span className={classes.criterion}>
                    {t(`badges.items.${badge.id}.criterion`)}
                  </span>
                </span>
                <span className={classes.date}>
                  {formatCalendarDate(
                    badge.unlockedOn,
                    "DD MMM YYYY",
                    i18n.language,
                  )}
                </span>
              </UnstyledButton>
            );
          })}
        </section>
      )}
    </Card>
  );
}

export default BadgeStrip;
