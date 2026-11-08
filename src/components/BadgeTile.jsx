import React from "react";
import { VisuallyHidden } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconExternalLink, IconMedal } from "@tabler/icons-react";
import { BADGE_ICONS } from "../constants/badgeIcons.ts";
import { formatBadgeProgress } from "../utils/badges.ts";
import { barcodePattern } from "../utils/barcode.ts";
import { formatCalendarDate } from "../utils/dateUtils";
import classes from "./BadgeTile.module.css";

/**
 * One badge, drawn as a boarding pass with a torn-off stub. A badge
 * with a Wikipedia article behind it is a link to that article, the whole card.
 * Locked badges are dashed and greyed.
 */
const BadgeTile = ({ badge }) => {
  const { t, i18n } = useTranslation("flights");
  const Icon = BADGE_ICONS[badge.id] ?? IconMedal;
  const name = t(`badges.items.${badge.id}.name`);
  const hasProgress = !badge.unlocked && typeof badge.target === "number";
  const date = formatCalendarDate(
    badge.unlockedOn,
    "DD MMM YYYY",
    i18n.language,
  );
  // Each language links its own Wikipedia; most badges have no link.
  const link = t(`badges.items.${badge.id}.link`, { defaultValue: "" });
  const Root = link ? "a" : "div";
  const linkProps = link
    ? {
        href: link,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": badge.unlocked
          ? t("badges.link_label_earned", { name, date })
          : t("badges.link_label_locked", { name }),
      }
    : {};

  let stub;
  if (badge.unlocked) {
    stub = (
      <span className={`${classes.stubText} ${classes.earned}`}>{date}</span>
    );
  } else if (hasProgress) {
    stub = (
      <span className={classes.progress}>
        <span
          role="progressbar"
          aria-label={t("badges.progress_label", { name })}
          aria-valuemin={0}
          aria-valuemax={badge.target}
          aria-valuenow={badge.current}
          className={classes.track}
        >
          <span
            className={classes.fill}
            style={{ width: `${(badge.current / badge.target) * 100}%` }}
          />
        </span>
        <span className={classes.stubText}>
          {formatBadgeProgress(badge, i18n.language)}
        </span>
      </span>
    );
  } else {
    stub = <span className={classes.stubText}>{t("badges.not_yet")}</span>;
  }

  return (
    <Root
      data-cy={`badge-${badge.id}`}
      className={`${classes.tile} ${badge.unlocked ? "" : classes.locked}`}
      {...linkProps}
    >
      <span className={classes.body}>
        <span className={classes.icon} aria-hidden="true">
          <Icon size={22} stroke={1.8} />
        </span>
        <span className={classes.text}>
          <span className={classes.name}>
            {name}
            {!badge.unlocked && (
              <VisuallyHidden component="span">
                , {t("badges.not_earned")}
              </VisuallyHidden>
            )}
          </span>
          <span className={classes.criterion}>
            {t(`badges.items.${badge.id}.criterion`)}
          </span>
        </span>
        {link && (
          <IconExternalLink
            size={16}
            className={classes.linkIcon}
            aria-hidden="true"
          />
        )}
      </span>
      <span className={classes.stub}>
        <span
          className={classes.barcode}
          style={{ backgroundImage: barcodePattern(badge.id) }}
          aria-hidden="true"
        />
        {stub}
      </span>
    </Root>
  );
};

export default BadgeTile;
