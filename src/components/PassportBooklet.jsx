import React, { useMemo, useRef, useState } from "react";
import { ActionIcon, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import {
  IconChevronLeft,
  IconChevronRight,
  IconMedal,
} from "@tabler/icons-react";
import { BADGE_ICONS } from "../constants/badgeIcons.ts";
import { formatCalendarDate } from "../utils/dateUtils";
import { bookletOrder } from "../utils/badges.ts";
import classes from "./PassportBooklet.module.css";

const STAMPS_PER_PAGE = 4;

// A hand-stamped page is never square. Fixed per slot rather than random, so a
// stamp does not wobble to a new angle on every render.
const TILTS = [-4, 3, 2, -3];

const Stamp = ({ badge, tilt }) => {
  const { t, i18n } = useTranslation("flights");
  const Icon = BADGE_ICONS[badge.id] ?? IconMedal;
  const name = t(`badges.items.${badge.id}.name`);

  if (!badge.unlocked) {
    return (
      <div
        className={`${classes.stamp} ${classes.reserved}`}
        data-cy={`stamp-${badge.id}`}
        title={t(`badges.items.${badge.id}.criterion`)}
      >
        <Icon size={22} stroke={1.4} />
        <Text size="xs" fw={600} lh={1.2}>
          {name}
        </Text>
      </div>
    );
  }

  return (
    <div
      className={classes.stamp}
      style={{ "--tilt": `${tilt}deg` }}
      data-cy={`stamp-${badge.id}`}
      title={t(`badges.items.${badge.id}.criterion`)}
    >
      <Icon size={26} stroke={1.6} />
      <Text size="xs" fw={800} tt="uppercase" lh={1.15}>
        {name}
      </Text>
      <Text size="xs" fw={700} className={classes.date}>
        {formatCalendarDate(badge.unlockedOn, "DD MMM YYYY", i18n.language)}
      </Text>
    </div>
  );
};

/**
 * The passport view of the badge shelf: one booklet whose pages hold four
 * stamps each. Paging is a CSS scroll-snap strip, so swiping works with no
 * script at all; the buttons and dots only scroll that same strip.
 */
const PassportBooklet = ({ badges, holder }) => {
  const { t } = useTranslation("flights");
  const reduceMotion = useReducedMotion();
  const stripRef = useRef(null);
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const ordered = bookletOrder(badges);
    const chunks = [];
    for (let i = 0; i < ordered.length; i += STAMPS_PER_PAGE) {
      chunks.push(ordered.slice(i, i + STAMPS_PER_PAGE));
    }
    return chunks;
  }, [badges]);

  const unlocked = badges.filter((badge) => badge.unlocked).length;

  const goTo = (index) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollTo({
      left: index * strip.clientWidth,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  // The strip is the source of truth: a swipe moves it, and the dots follow.
  const handleScroll = (event) => {
    const strip = event.currentTarget;
    if (strip.clientWidth > 0) {
      setPage(Math.round(strip.scrollLeft / strip.clientWidth));
    }
  };

  return (
    <div className={classes.booklet} data-cy="passport-booklet">
      <Group className={classes.header} justify="space-between" wrap="wrap">
        <Stack gap={0}>
          <Text size="xs" fw={700} tt="uppercase" className={classes.spaced}>
            {t("badges.booklet.title")}
          </Text>
          {holder && (
            <Text size="sm" fw={600}>
              {holder}
            </Text>
          )}
        </Stack>
        <Text size="sm" fw={600}>
          {t("badges.booklet.stamps", {
            count: unlocked,
            total: badges.length,
          })}
        </Text>
      </Group>

      <div
        ref={stripRef}
        className={classes.strip}
        onScroll={handleScroll}
        role="region"
        aria-label={t("badges.booklet.title")}
        tabIndex={0}
      >
        {pages.map((stamps, index) => (
          <div
            key={index}
            className={classes.page}
            aria-label={t("badges.booklet.page", { n: index + 1 })}
          >
            {stamps.map((badge, slot) => (
              <Stamp key={badge.id} badge={badge} tilt={TILTS[slot]} />
            ))}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <Group justify="center" gap="xs" className={classes.controls}>
          <ActionIcon
            variant="subtle"
            aria-label={t("badges.booklet.previous")}
            disabled={page === 0}
            onClick={() => goTo(page - 1)}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          {pages.map((_, index) => (
            <UnstyledButton
              key={index}
              className={classes.dot}
              data-active={index === page || undefined}
              aria-label={t("badges.booklet.page", { n: index + 1 })}
              aria-current={index === page ? "page" : undefined}
              onClick={() => goTo(index)}
            />
          ))}
          <ActionIcon
            variant="subtle"
            aria-label={t("badges.booklet.next")}
            disabled={page === pages.length - 1}
            onClick={() => goTo(page + 1)}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      )}
    </div>
  );
};

export default PassportBooklet;
