import React from "react";
import { Card, Group, Stack, Text, Progress, ThemeIcon } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconExternalLink, IconMedal } from "@tabler/icons-react";
import { BADGE_ICONS } from "../constants/badgeIcons.ts";
import { DISTANCE_BADGES } from "../utils/badges.ts";
import { barcodePattern } from "../utils/barcode.ts";
import { formatCalendarDate } from "../utils/dateUtils";
import classes from "./BadgeTile.module.css";

// Kilometres read better rounded and grouped; counts are already small.
const formatProgress = (badge, language) => {
  const value = Math.round(badge.current).toLocaleString(language);
  const target = Math.round(badge.target).toLocaleString(language);
  const suffix = DISTANCE_BADGES.has(badge.id) ? " km" : "";
  return `${value} / ${target}${suffix}`;
};

/**
 * One badge, drawn as a boarding pass with a torn-off stub. A badge with a
 * Wikipedia article behind it is a link to that article, the whole card.
 */
const BadgeTile = ({ badge }) => {
  const { t, i18n } = useTranslation("flights");
  const Icon = BADGE_ICONS[badge.id] ?? IconMedal;
  const hasProgress = typeof badge.target === "number";
  const percent = hasProgress ? (badge.current / badge.target) * 100 : 0;
  const date = formatCalendarDate(
    badge.unlockedOn,
    "DD MMM YYYY",
    i18n.language,
  );
  // Each language links its own Wikipedia; most badges have no link.
  const link = t(`badges.items.${badge.id}.link`, { defaultValue: "" });
  const linkProps = link
    ? {
        component: "a",
        href: link,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": t("badges.link_label", {
          name: t(`badges.items.${badge.id}.name`),
        }),
      }
    : {};

  const header = (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <ThemeIcon
        variant="light"
        size={46}
        radius="md"
        color={badge.unlocked ? "primary" : "gray"}
      >
        <Icon size={26} stroke={1.6} />
      </ThemeIcon>
      <Stack gap={2}>
        <Text fw={700} lh={1.2} c={badge.unlocked ? undefined : "dimmed"}>
          {t(`badges.items.${badge.id}.name`)}
        </Text>
        <Text size="xs" c="dimmed" lh={1.3}>
          {t(`badges.items.${badge.id}.criterion`)}
        </Text>
      </Stack>
    </Group>
  );

  const progress = (
    <Stack gap={3} style={{ flex: "0 0 46%" }}>
      <Progress value={percent} size="sm" color="accent" radius="xl" />
      <Text size="xs" c="dimmed" ff="monospace" ta="right">
        {formatProgress(badge, i18n.language)}
      </Text>
    </Stack>
  );

  const footer = (
    <div className={classes.stub} style={{ marginTop: "auto" }}>
      <Group gap="sm" justify="space-between" wrap="nowrap" align="center">
        <div
          className={classes.barcode}
          style={{ backgroundImage: barcodePattern(badge.id) }}
          aria-hidden="true"
        />
        {badge.unlocked ? (
          <Text size="xs" c="primary.7" fw={600} tt="uppercase" ff="monospace">
            {date}
          </Text>
        ) : hasProgress ? (
          progress
        ) : (
          <Text size="xs" c="dimmed" tt="uppercase" ff="monospace">
            {t("badges.not_yet")}
          </Text>
        )}
      </Group>
    </div>
  );

  return (
    <Card
      shadow={badge.unlocked ? "sm" : undefined}
      radius="md"
      withBorder
      padding="sm"
      data-cy={`badge-${badge.id}`}
      className={`${classes.tile} ${badge.unlocked ? "" : classes.locked} ${link ? classes.linked : ""}`}
      {...linkProps}
    >
      {link && (
        <IconExternalLink
          size={14}
          className={classes.linkIcon}
          aria-hidden="true"
        />
      )}
      <Stack gap="xs" h="100%">
        {header}
        {footer}
      </Stack>
    </Card>
  );
};

export default BadgeTile;
