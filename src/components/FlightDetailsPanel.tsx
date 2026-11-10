import React from "react";
import { useTranslation } from "react-i18next";
import type { enhancedFlight } from "../types/enhancedFlight";
import { getAirMinutes, parseUtc } from "../utils/airTime";
import classes from "./FlightDetails.module.css";

interface FlightDetailsPanelProps {
  flight: enhancedFlight;
}

type FlightLegTime = {
  scheduledTime?: { utc?: string; local?: string };
  revisedTime?: { utc?: string; local?: string };
  actualTime?: { utc?: string; local?: string };
  /** When the wheels left or touched the runway. */
  runwayTime?: { utc?: string; local?: string };
  terminal?: string;
  gate?: string;
  checkInDesk?: string;
  baggageBelt?: string;
};
type FlightLeg = {
  status?: string;
  departure?: FlightLegTime;
  arrival?: FlightLegTime;
  aircraft?: { model?: string; reg?: string };
};

// AeroDataBox doesn't return a delay field directly - it's the gap between
// the original schedule and the revised one. An exact match returns 0 (not
// null) so "on time" renders as its own chip rather than silently showing
// nothing; null means the comparison isn't possible (one side missing).
const getDelayMinutes = (
  scheduledTime: FlightLegTime["scheduledTime"] | undefined,
  revisedTime: FlightLegTime["revisedTime"] | undefined,
): number | null => {
  const scheduled = parseUtc(scheduledTime?.utc);
  const revised = parseUtc(revisedTime?.utc);
  if (!scheduled || !revised) return null;
  return Math.round((revised.getTime() - scheduled.getTime()) / 60000);
};

// AeroDataBox's local time strings already carry the airport's own UTC
// offset (e.g. "2026-07-01 11:51+01:00") - pulling the HH:mm out directly
// avoids re-interpreting it in the browser's timezone.
const extractLocalTime = (value: string | undefined): string | null => {
  if (!value) return null;
  const match = value.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/);
  return match?.[1] ?? null;
};

// Green for a finished flight, red for one that never arrived as planned,
// grey for everything still in progress.
const getStatusTone = (status: string | undefined) => {
  if (/landed|arrived/i.test(status ?? "")) return "ok";
  if (/cancelled|diverted/i.test(status ?? "")) return "bad";
  return undefined;
};

const LegBlock: React.FC<{
  heading: string;
  leg: FlightLegTime | undefined;
}> = ({ heading, leg }) => {
  const { t } = useTranslation(["flights"]);
  const scheduled = extractLocalTime(leg?.scheduledTime?.local);
  const revised = extractLocalTime(leg?.revisedTime?.local);
  const actual = extractLocalTime(leg?.actualTime?.local);
  const delay = getDelayMinutes(
    leg?.scheduledTime,
    leg?.actualTime ?? leg?.revisedTime,
  );
  const primaryTime = actual ?? revised ?? scheduled;
  // Only worth a separate line when the two actually differ - a 0-minute
  // delay means they're the same instant, just spelled out twice.
  const showScheduledSeparately =
    delay !== null && delay !== 0 && scheduled && scheduled !== primaryTime;
  const place = [
    leg?.terminal && t("status.terminal", { value: leg.terminal }),
    leg?.gate && t("status.gate", { value: leg.gate }),
  ]
    .filter(Boolean)
    .join(" · ");

  if (!primaryTime && !place && !leg?.checkInDesk && !leg?.baggageBelt) {
    return null;
  }

  return (
    <div className={classes.leg}>
      <span className={classes.label}>{heading}</span>
      {(primaryTime || delay !== null) && (
        <span className={classes.legTime}>
          {primaryTime && <span className={classes.time}>{primaryTime}</span>}
          {delay !== null && (
            <span
              className={classes.chip}
              data-tone={delay > 0 ? "warn" : "ok"}
            >
              {delay === 0
                ? t("status.on_time")
                : delay > 0
                  ? t("status.delay_late", { value: delay })
                  : t("status.delay_early", { value: Math.abs(delay) })}
            </span>
          )}
        </span>
      )}
      {showScheduledSeparately && (
        <span className={classes.note}>
          {t("status.scheduled_time", { value: scheduled })}
        </span>
      )}
      {place && <span className={classes.note}>{place}</span>}
      {leg?.checkInDesk && (
        <span className={classes.note}>
          {t("status.check_in_desk", { value: leg.checkInDesk })}
        </span>
      )}
      {leg?.baggageBelt && (
        <span className={classes.note}>
          {t("status.baggage_belt", { value: leg.baggageBelt })}
        </span>
      )}
    </div>
  );
};

const FlightDetailsPanel: React.FC<FlightDetailsPanelProps> = ({ flight }) => {
  const { t, i18n } = useTranslation(["flights"]);
  const statusData = flight.flight_status as FlightLeg | null | undefined;

  if (!statusData) {
    return (
      <section aria-labelledby="flight-status-title" className={classes.card}>
        <h3 id="flight-status-title" className={classes.cardTitle}>
          {t("status.title")}
        </h3>
        <p className={classes.empty}>
          {t(
            flight.flight_number ? "status.no_data" : "status.no_flight_number",
          )}
        </p>
      </section>
    );
  }

  const tone = getStatusTone(statusData.status);
  const { model, reg } = statusData.aircraft ?? {};
  const airMinutes = getAirMinutes(statusData.departure, statusData.arrival);
  // Each runway figure shows only when AeroDataBox sent it.
  const runway = [
    [
      t("status.wheels_up"),
      extractLocalTime(statusData.departure?.runwayTime?.local),
    ],
    [
      t("status.touchdown"),
      extractLocalTime(statusData.arrival?.runwayTime?.local),
    ],
    [
      t("status.in_the_air"),
      airMinutes !== null &&
        t("details.duration", {
          hours: Math.floor(airMinutes / 60),
          minutes: airMinutes % 60,
        }),
    ],
  ].filter(([, value]) => value);

  return (
    <section aria-labelledby="flight-status-title" className={classes.card}>
      <div className={classes.cardHead}>
        <div>
          <h3 id="flight-status-title" className={classes.cardTitle}>
            {t("status.title")}
          </h3>
          {flight.flight_status_checked_at && (
            <p className={classes.note}>
              {t("status.checked_at", {
                value: new Date(flight.flight_status_checked_at).toLocaleString(
                  i18n.language,
                  { dateStyle: "medium", timeStyle: "short" },
                ),
                interpolation: { escapeValue: false },
              })}
            </p>
          )}
        </div>
        <span className={classes.chip} data-tone={tone}>
          {statusData.status ?? t("status.unknown")}
        </span>
      </div>

      <div className={classes.legs}>
        <LegBlock
          heading={t("status.departure_heading")}
          leg={statusData.departure}
        />
        <LegBlock
          heading={t("status.arrival_heading")}
          leg={statusData.arrival}
        />
      </div>

      {runway.length > 0 && (
        <dl className={classes.runway}>
          {runway.map(([label, value]) => (
            <div key={label as string}>
              <dt className={classes.label}>{label}</dt>
              <dd className={classes.time}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(model || reg) && (
        <p className={classes.aircraft}>
          {model}
          {reg && (
            <span className={classes.muted}>
              {model && " · "}
              {reg}
            </span>
          )}
        </p>
      )}

      {flight.flight_status_checked_at && (
        <p className={classes.note}>{t("status.source")}</p>
      )}
    </section>
  );
};

export default FlightDetailsPanel;
