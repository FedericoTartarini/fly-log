import React from "react";
import { Card, Group, Stack, Text, Progress, ThemeIcon } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconMedal } from "@tabler/icons-react";
import { BADGE_ICONS, BADGE_STYLES } from "../constants/badgeIcons.ts";
import { DISTANCE_BADGES } from "../utils/badges.ts";
import { barcodePattern } from "../utils/barcode.ts";
import { formatDate } from "../utils/dateUtils";
import classes from "./BadgeTile.module.css";

// Kilometres read better rounded and grouped; counts are already small.
const formatProgress = (badge, language) => {
  const value = Math.round(badge.current).toLocaleString(language);
  const target = Math.round(badge.target).toLocaleString(language);
  const suffix = DISTANCE_BADGES.has(badge.id) ? " km" : "";
  return `${value} / ${target}${suffix}`;
};

/**
 * One badge. Two looks over identical content: a boarding pass with a torn-off
 * stub, or a passport stamp inked onto the page.
 */
const BadgeTile = ({ badge, styleName = BADGE_STYLES.PASS }) => {
  const { t, i18n } = useTranslation("flights");
  const Icon = BADGE_ICONS[badge.id] ?? IconMedal;
  const hasProgress = typeof badge.target === "number";
  const percent = hasProgress ? (badge.current / badge.target) * 100 : 0;
  const date = formatDate(badge.unlockedOn, "DD MMM YYYY", i18n.language);

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

  const footer =
    styleName === BADGE_STYLES.STAMP ? (
      <div
        className={`${classes.stamp} ${badge.unlocked ? "" : classes.stampEmpty}`}
        style={{ marginTop: "auto" }}
      >
        {badge.unlocked ? (
          <Stack gap={0} align="center">
            <Text size="xs" fw={700} tt="uppercase" lh={1.2}>
              {t("badges.stamp_caption")}
            </Text>
            <Text size="sm" fw={700} className={classes.stampDate} lh={1.3}>
              {date}
            </Text>
          </Stack>
        ) : hasProgress ? (
          <Group justify="center">{progress}</Group>
        ) : (
          <Text size="xs" ta="center" tt="uppercase" fw={600}>
            {t("badges.not_yet")}
          </Text>
        )}
      </div>
    ) : (
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
      className={`${classes.tile} ${badge.unlocked ? "" : classes.locked}`}
    >
      <Stack gap="xs" h="100%">
        {header}
        {footer}
      </Stack>
    </Card>
  );
};

export default BadgeTile;
