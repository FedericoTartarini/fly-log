import { Skeleton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import classes from "../pages/FlightsStats.module.css";

// Placeholder that mirrors the stats page: the map, then the sheet with the
// boarding pass, the two record cards next to the badges, and the two charts.
// It reuses the page's own classes, so the sizes and the two-column switch
// match and nothing jumps when the real page arrives. Heights are the desktop
// ones measured on the real page. role="status" lets screen readers announce
// the loading state.
const PageSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <div className={classes.page} role="status" aria-label={t("loading")}>
      <div className={classes.map}>
        <Skeleton height="100%" radius={0} />
      </div>

      <div className={classes.sheet}>
        <div aria-hidden className={classes.handle} />

        <Skeleton height={334} radius="lg" />

        <div className={classes.columns}>
          <div className={classes.records}>
            <Skeleton height={157} radius="md" />
            <Skeleton height={157} radius="md" />
          </div>
          <Skeleton height={326} radius="md" />
        </div>

        <div className={classes.columns}>
          <Skeleton height={430} radius="md" />
          <Skeleton height={430} radius="md" />
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
