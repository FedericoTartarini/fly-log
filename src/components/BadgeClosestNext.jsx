import React, { useId } from "react";
import { IconMedal } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  formatBadgeProgress,
  amountLeft,
  DISTANCE_BADGES,
} from "../utils/badges.ts";
import { BADGE_ICONS } from "../constants/badgeIcons.ts";
import classes from "./BadgeClosestNext.module.css";

/**
 * The locked badge nearest to done, with what it asks for and how far there is
 * still to go. Shared by the Badges page and the Badges card on Stats.
 */
const BadgeClosestNext = ({ badge, headingOrder = 2, className }) => {
  const { t, i18n } = useTranslation("flights");
  const id = useId();
  const Icon = BADGE_ICONS[badge.id] ?? IconMedal;
  const Heading = `h${headingOrder}`;
  const name = t(`badges.items.${badge.id}.name`);
  const remaining = amountLeft(badge);

  return (
    <section
      className={`${classes.next} ${className ?? ""}`}
      aria-labelledby={id}
    >
      <span className={classes.nextIcon} aria-hidden="true">
        <Icon size={22} stroke={1.8} />
      </span>
      <Heading id={id} className={classes.label}>
        {t("badges.closest_next")}
      </Heading>
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
      {/* A name like "Well travelled" alone does not say it means 25
          countries, so the criterion always sits under it. */}
      <p className={classes.criterion}>
        {t(`badges.items.${badge.id}.criterion`)}
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

export default BadgeClosestNext;
