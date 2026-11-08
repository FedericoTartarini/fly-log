import React from "react";
import { Text, Title, UnstyledButton } from "@mantine/core";
import { IconPencil, IconSparkles, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store.ts";
import { FLIGHT_ENTRY_TABS } from "../constants/tabs.ts";
import pass from "./BoardingPass.module.css";
import classes from "./NoFlightsCard.module.css";

// One way to add a first flight. Each opens the add-flight form on its tab.
const OPTIONS = [
  { tab: FLIGHT_ENTRY_TABS.AI, key: "ai", icon: <IconSparkles stroke={1.8} /> },
  {
    tab: FLIGHT_ENTRY_TABS.MANUAL,
    key: "manual",
    icon: <IconPencil stroke={1.8} />,
  },
  { tab: FLIGHT_ENTRY_TABS.CSV, key: "csv", icon: <IconUpload stroke={1.8} /> },
];

/**
 * Empty state for pages that need flights: a blank boarding pass whose stub
 * offers the three ways to add a first flight.
 *
 * `welcome` is the Stats page version, with its own h1 and the totals at 0.
 * Other pages pass `title` and `text` for their card, under the page's h1.
 */
function NoFlightsCard({ welcome = false, title, text }) {
  const { t } = useTranslation("flights");
  const setAddFlightOpened = useFlightStore((s) => s.setAddFlightOpened);

  return (
    <section aria-labelledby="no-flights-title" className={pass.pass}>
      <div className={pass.main}>
        <div className={classes.intro}>
          <Title
            id="no-flights-title"
            order={welcome ? 1 : 2}
            className={welcome ? classes.welcome : classes.title}
          >
            {welcome ? t("no_flights_card.welcome_title") : title}
          </Title>
          <Text c="var(--fl-muted)" m={0}>
            {welcome ? t("no_flights_card.welcome_text") : text}
          </Text>
        </div>
        {welcome && (
          <dl className={`${pass.fields} ${classes.zeros}`}>
            <div>
              <dt>{t("pass.flights")}</dt>
              <dd>0</dd>
            </div>
            <div>
              <dt>{t("no_flights_card.kilometres")}</dt>
              <dd>0</dd>
            </div>
            <div>
              <dt>{t("pass.countries")}</dt>
              <dd>0</dd>
            </div>
          </dl>
        )}
      </div>
      <div className={pass.stub}>
        <Text component="h2" fz={14} fw={500} c="var(--fl-muted)" m={0}>
          {t("no_flights_card.add_first")}
        </Text>
        {OPTIONS.map(({ tab, key, icon }) => (
          <UnstyledButton
            key={key}
            className={classes.option}
            data-primary={key === "ai" || undefined}
            onClick={() => setAddFlightOpened(true, tab)}
          >
            <span className={classes.optionIcon} aria-hidden>
              {icon}
            </span>
            <span>
              <span className={classes.optionTitle}>
                {t(`no_flights_card.${key}_title`)}
              </span>
              <span className={classes.optionText}>
                {t(`no_flights_card.${key}_text`)}
              </span>
            </span>
          </UnstyledButton>
        ))}
      </div>
    </section>
  );
}

export default NoFlightsCard;
