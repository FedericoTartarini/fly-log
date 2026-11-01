import React from "react";
import { Link } from "react-router-dom";
import { Button, Text } from "@mantine/core";
import { IconArrowNarrowRight, IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store.ts";
import { useFlightStats } from "../hooks/useFlightStats.js";
import { EARTH_CIRCUMFERENCE } from "../constants/distances";
import { IDS, PATHS } from "../constants/MyClasses.ts";
import {
  formatCalendarDate,
  getYear,
  normalizeTimeString,
} from "../utils/dateUtils";
import { getAirportCity } from "../utils/airportUtils";
import { barcodePattern } from "../utils/barcode.ts";
import { pickStubFlight } from "../utils/pickStubFlight.js";
import classes from "./BoardingPass.module.css";

// `as="dl"` for a field that stands alone, outside a list of fields.
const Field = ({ id, label, value, className, as = "div" }) => {
  const Tag = as;
  return (
    <Tag className={className}>
      <dt data-cy={id && `${id}-label`}>{label}</dt>
      <dd data-cy={id && `${id}-value`}>{value}</dd>
    </Tag>
  );
};

// The stub under the perforation: next flight, or the last one if none is
// booked.
const Stub = ({ entry }) => {
  const { t, i18n } = useTranslation("flights");
  const { flight, days } = entry;
  const heading =
    days >= 0
      ? t("pass.next_flight", { count: days })
      : t("pass.last_flight", { count: -days });
  const from = flight.departure_airport_iata;
  const to = flight.arrival_airport_iata;

  return (
    <div className={classes.stub}>
      <Text component="h2" fz={14} fw={500} c="var(--fl-muted)" m={0}>
        {heading}
      </Text>
      <p className={`${classes.route} ${classes.mono}`}>
        <span>{from}</span>
        <IconArrowNarrowRight
          size={28}
          color="var(--fl-accent)"
          role="img"
          aria-label={t("to")}
        />
        <span>{to}</span>
      </p>
      <Text m={0} c="var(--fl-muted)">
        {t("pass.route", {
          from: getAirportCity(from) ?? from,
          to: getAirportCity(to) ?? to,
        })}
      </Text>
      <dl className={classes.stubFields}>
        <Field
          label={t("pass.date")}
          value={formatCalendarDate(
            flight.departure_date,
            "D MMM YYYY",
            i18n.language,
          )}
        />
        <Field
          label={t("pass.departs")}
          value={normalizeTimeString(flight.departure_time) ?? "–"}
        />
        <Field label={t("pass.flight")} value={flight.flight_number || "–"} />
      </dl>
      <div
        aria-hidden
        className={classes.barcode}
        style={{ backgroundImage: barcodePattern(flight.id ?? "", 48) }}
      />
    </div>
  );
};

/**
 * Lifetime totals for the filtered flights, styled as a boarding pass, with a
 * stub for the next flight. The stub reads every flight, so a filter never
 * hides an upcoming trip.
 */
function BoardingPass() {
  const filteredFlights = useFlightStore((s) => s.filteredFlights);
  const allFlights = useFlightStore((s) => s.allFlights);
  const stats = useFlightStats(filteredFlights);
  const { t, i18n } = useTranslation("flights");
  const number = (value) => Math.round(value).toLocaleString(i18n.language);

  const years = filteredFlights
    .map((f) => getYear(f.departure_date))
    .filter(Boolean);
  const firstYear = years.length ? Math.min(...years) : null;

  const laps = stats.totalDistance / EARTH_CIRCUMFERENCE;
  const comparison =
    laps >= 1
      ? t("pass.around_earth", { count: Math.floor(laps) })
      : t("pass.part_of_earth", { value: Math.round(laps * 100) });

  // Days once there is at least one, hours before that.
  const hours = stats.totalFlightTime;
  const inTheAir =
    hours >= 24
      ? t("pass.days", { value: number(hours / 24) })
      : t("pass.hours", { value: number(hours) });

  const stub = pickStubFlight(allFlights);

  return (
    <section aria-label={t("pass.label")} className={classes.pass}>
      <div className={classes.main}>
        <div>
          <Text
            fz={14}
            c="var(--fl-muted)"
            m={0}
            data-cy={`${IDS.STATS.TOTAL_DISTANCE}-label`}
          >
            {firstYear
              ? t("pass.distance_since", { year: firstYear })
              : t("pass.distance")}
          </Text>
          <p
            className={`${classes.km} ${classes.mono}`}
            data-cy={`${IDS.STATS.TOTAL_DISTANCE}-value`}
          >
            {t("km", { value: number(stats.totalDistance) })}
          </p>
          <Text c="var(--fl-muted)" mt={4}>
            {comparison}
          </Text>
        </div>
        {/* One <dl> per field, so the button can share their grid. */}
        <div className={classes.fields}>
          <Field
            as="dl"
            id={IDS.STATS.TOTAL_FLIGHTS}
            label={t("pass.flights")}
            value={number(filteredFlights.length)}
          />
          <Field
            as="dl"
            id={IDS.STATS.TOTAL_TIME}
            label={t("pass.in_the_air")}
            value={inTheAir}
          />
          <Field
            as="dl"
            id={IDS.STATS.COUNTRIES_VISITED}
            label={t("pass.countries")}
            value={number(stats.countries)}
          />
          <Field
            as="dl"
            id={IDS.STATS.AIRPORTS_VISITED}
            label={t("pass.airports")}
            value={number(stats.airports)}
            className={classes.wideOnly}
          />
          <Field
            as="dl"
            id={IDS.STATS.AIRLINES_FLOWN}
            label={t("pass.airlines")}
            value={number(stats.airlines)}
            className={classes.wideOnly}
          />
          <Button
            component={Link}
            to={PATHS.ALL_STATS}
            variant="default"
            size="md"
            // An empty left section as wide as the chevron keeps the label
            // centred.
            justify="space-between"
            leftSection={<span style={{ width: 18 }} />}
            rightSection={<IconChevronRight size={18} aria-hidden />}
            classNames={{
              root: classes.allStats,
              label: classes.allStatsLabel,
            }}
            data-cy={IDS.STATS.ALL_STATS_LINK}
          >
            {t("pass.see_all")}
          </Button>
        </div>
      </div>
      {stub && <Stub entry={stub} />}
    </section>
  );
}

export default BoardingPass;
