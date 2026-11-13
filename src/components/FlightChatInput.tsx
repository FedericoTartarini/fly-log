import React, { useState } from "react";
import { Textarea, Button, Text, Alert, List } from "@mantine/core";
import { IconAlertCircle, IconInfoCircle } from "@tabler/icons-react";
import {
  parseFlightFromText,
  REQUIRED_FIELDS,
  type ParsedFlight,
} from "../utils/flightAiParser";
import { useTranslation } from "react-i18next";
import { getAirportCity } from "../utils/airportUtils";
import { getAirlineName } from "../utils/airlineUtils";
import { formatDate } from "../utils/dateUtils";
import classes from "./FlightEntryForm.module.css";

interface FlightChatInputProps {
  /** Called as soon as parsing succeeds — pre-fills the form fields. */
  onParsed: (flights: ParsedFlight[]) => void;
  /** Called when the user clicks "Review N flights" after a successful parse. */
  onConfirm: () => void;
}

/** Map each required field key to its i18n key in the form labels namespace. */
const FIELD_I18N_KEYS: Record<string, string> = {
  departure_airport_iata: "form.labels.departure_airport",
  arrival_airport_iata: "form.labels.arrival_airport",
  departure_date: "form.labels.departure_date",
  airline_iata: "form.labels.airline",
};

// AI-assisted natural language parser for flight entry.
export const FlightChatInput: React.FC<FlightChatInputProps> = ({
  onParsed,
  onConfirm,
}) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedFlight[] | null>(null);
  const { t } = useTranslation("flights");

  const isMultiLeg = (parsed?.length ?? 0) > 1;

  // Prefix each missing field with its leg number when there are several legs.
  const missingFields: string[] = (parsed ?? []).flatMap((leg, index) =>
    REQUIRED_FIELDS.filter((f) => !leg[f]).map((f) => {
      const label = t(FIELD_I18N_KEYS[f] ?? String(f));
      return isMultiLeg
        ? `${t("form.labels.flight_n", { n: index + 1 })}: ${label}`
        : label;
    }),
  );

  // The parser only returns legs with at least one airport.
  const hasAnyParsedField = Boolean(parsed?.length);

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);

    try {
      const result = await parseFlightFromText(input);
      setParsed(result);
      onParsed(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("ai.error_generic");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.panel}>
      <div>
        <h2 className={classes.heading}>{t("ai.title")}</h2>
        <p className={classes.muted} style={{ marginTop: 4 }}>
          {t("ai.subtitle")}
        </p>
      </div>

      <Textarea
        aria-label={t("ai.input_label")}
        placeholder={t("ai.input_placeholder")}
        value={input}
        onChange={(e) => {
          setInput(e.currentTarget.value);
          setError(null);
          setParsed(null);
        }}
        minRows={4}
        autosize
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleParse();
          }
        }}
      />

      <div className={classes.note}>
        <p className={classes.noteTitle}>{t("ai.include_title")}</p>
        <p className={classes.muted}>{t("ai.include_text")}</p>
        <p className={classes.muted} style={{ marginTop: 4 }}>
          {t("ai.example_label")}
        </p>
        <p style={{ fontStyle: "italic" }}>“{t("ai.example")}”</p>
      </div>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          title={t("ai.error_title")}
          variant="light"
        >
          {error}
        </Alert>
      )}

      {hasAnyParsedField && parsed && (
        <section
          aria-labelledby="ai-found"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <h3
            id="ai-found"
            className={classes.heading}
            style={{ fontSize: 17 }}
          >
            {t("ai.found", { count: parsed.length })}
          </h3>
          <ul className={classes.found}>
            {parsed.map((leg, index) => (
              <li key={index}>
                <span className={classes.codes}>
                  {leg.departure_airport_iata ?? "?"}
                  <span className={classes.arrow} aria-hidden>
                    →
                  </span>
                  {leg.arrival_airport_iata ?? "?"}
                </span>
                <span className={`${classes.mono} ${classes.right}`}>
                  {formatDate(leg.departure_date, "D MMM YYYY")}
                </span>
                <span className={`${classes.muted} ${classes.small}`}>
                  {leg.departure_airport_iata && leg.arrival_airport_iata
                    ? t("list.cities", {
                        from: getAirportCity(leg.departure_airport_iata),
                        to: getAirportCity(leg.arrival_airport_iata),
                      })
                    : ""}
                </span>
                <span
                  className={`${classes.mono} ${classes.muted} ${classes.right}`}
                  style={{ fontSize: 13 }}
                >
                  {leg.airline_iata ? getAirlineName(leg.airline_iata) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {parsed && missingFields.length > 0 && (
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="yellow"
          title={t("ai.missing_title")}
          variant="light"
        >
          <Text size="xs" mb={4}>
            {t("ai.missing_subtitle")}
          </Text>
          <List size="xs" spacing={2}>
            {missingFields.map((field) => (
              <List.Item key={field}>
                <Text size="xs" fw={500}>
                  {field}
                </Text>
              </List.Item>
            ))}
          </List>
        </Alert>
      )}

      <p className={classes.muted} style={{ fontSize: 12 }}>
        {t("ai.powered_by")}
      </p>

      <div className={classes.footer}>
        {hasAnyParsedField && parsed ? (
          <Button fullWidth size="lg" onClick={onConfirm}>
            {t("ai.review", { count: parsed.length })}
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={handleParse}
            loading={loading}
            disabled={!input.trim()}
          >
            {t("ai.parse_button")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FlightChatInput;
